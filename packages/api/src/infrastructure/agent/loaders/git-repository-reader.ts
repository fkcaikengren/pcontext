import { SimpleDirectoryReader } from "@llamaindex/readers/directory";
import type { Document } from "llamaindex";
import { exec as execCb } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "@/lib/logger";
import { TMP_GIT_REPOS_PATH } from '@pcontext/shared'

const exec = promisify(execCb);

export type FilterDirectories = {
  includes?: string[];
  excludes?: string[];
};

/**
 * filter file extensions
 */
export type FilterFileExtensions = {
  includes?: string[];
  excludes?: string[];
};

/**
 * github repository reader options
 */
export type GitRepositoryReaderOptions = {
  repo: string;
  branch?: string;
  filterDirectories?: FilterDirectories;
  filterFileExtensions?: FilterFileExtensions;
  targetBaseDir?: string;
  numWorkers?: number;
  debug?: boolean;
};

/**
 * github repository reader
 */
export class GitRepositoryReader {
  private readonly repo: string;
  private readonly branch?: string;
  private readonly filterDirectories: FilterDirectories;
  private readonly filterFileExtensions: FilterFileExtensions;
  private readonly targetBaseDir: string;
  private readonly numWorkers: number;
  private readonly debug: boolean;

  constructor(options: GitRepositoryReaderOptions) {
    this.repo = options.repo;
    this.branch = options.branch;
    this.filterDirectories = options.filterDirectories ?? {};
    this.filterFileExtensions = options.filterFileExtensions ?? {};
    this.targetBaseDir = options.targetBaseDir ?? TMP_GIT_REPOS_PATH;
    this.numWorkers = options.numWorkers ?? 4;
    this.debug = options.debug ?? false;
  }

  /**
   * load data from github repository
   */
  async loadData(): Promise<Document[]> {
    const repoDir = await this.ensureRepository();

    const includes = (this.filterDirectories.includes ?? []).map((d) => normalizeDir(d));
    const excludes = (this.filterDirectories.excludes ?? []).map((d) => normalizeDir(d));

    const extIncludesSet = new Set(
      (this.filterFileExtensions.includes ?? []).map((e) => normalizeExt(e)),
    );
    const extExcludesSet = new Set(
      (this.filterFileExtensions.excludes ?? []).map((e) => normalizeExt(e)),
    );

    const observer = (
      category: "file" | "directory",
      name: string,
      status: number,
    ): boolean => {
      if (category === "file" && status === 0) {
        const rel = path.relative(repoDir, name);
        const inExcludeDir = excludes.some(
          (ex) => rel === ex || rel.startsWith(ex + path.sep),
        );
        if (inExcludeDir) return false;

        const inIncludeDir = includes.length === 0
          ? true
          : includes.some((inc) => rel === inc || rel.startsWith(inc + path.sep));
        if (!inIncludeDir) return false;

        const ext = normalizeExt(path.extname(name));
        if (extExcludesSet.has(ext)) return false;
        if (extIncludesSet.size > 0 && !extIncludesSet.has(ext)) return false;
      }
      return true;
    };

    const reader = new SimpleDirectoryReader(observer);

    const roots: string[] = includes.length > 0
      ? includes.map((d) => path.join(repoDir, d))
      : [repoDir];

    const docs: Document[] = [];
    for (const root of roots) {
      const exists = await pathExists(root);
      if (!exists) continue;
      const part = await reader.loadData({
        directoryPath: root,
        numWorkers: this.numWorkers,
      });
      docs.push(...part);
    }
    return docs;
  }

  /**
   * ensure repository is cloned
   */
  private async ensureRepository(): Promise<string> {
    const repoName = deriveRepoName(this.repo);
    await fs.mkdir(this.targetBaseDir, { recursive: true });
    logger.info(`[git info]: start to clone repository "${repoName}" to directory "${this.targetBaseDir}"`);
    if (this.debug) {
      const existing = await findExistingRepoDir(this.targetBaseDir, repoName);
      if (existing) {
        logger.info(`[git info]: repository "${repoName}" already cloned, use existing directory`);
        return existing;
      }
    }
    const uniqueDirName = `${repoName}-${randomUUID()}`;
    const repoDir = path.join(this.targetBaseDir, uniqueDirName);
    const branchArg = this.branch
      ? ` --branch ${shellEscape(this.branch)} --single-branch`
      : "";
    try {
      await exec(
        `git clone --depth 1${branchArg} ${shellEscape(this.repo)} ${shellEscape(repoDir)}`,
      );
    } catch {
      logger.warn("[git error]: git clone (use http2) failed, try http1.1");
      try {
        await exec(
          `git clone -c http.version=HTTP/1.1 --depth 1${branchArg} ${shellEscape(this.repo)} ${shellEscape(repoDir)}`,
        );
        logger.info(`[git info]: repository "${repoName}" cloned successfully`);
      } catch {
        logger.error("[git error]: git clone (use http1.1) failed");
        throw new Error(`git clone failed for repository "${this.repo}". please make sure the repository is public and accessible.`);
      }
    }
    return repoDir;
  }

  /**
   * clear temporary repository directory
   */
  async clearTmpRepo(dir: string): Promise<void> {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function deriveRepoName(repoUrl: string): string {
  const withoutSuffix = repoUrl.endsWith(".git")
    ? repoUrl.slice(0, -4)
    : repoUrl;
  const segments = withoutSuffix.split("/");
  return segments[segments.length - 1] || "repo";
}

function normalizeDir(d: string): string {
  const p = d.replace(/^\/+/, "");
  return p.replace(/\\/g, path.sep);
}

function normalizeExt(extOrName: string): string {
  const ext = extOrName.startsWith(".") ? extOrName.slice(1) : extOrName;
  return ext.toLowerCase();
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findExistingRepoDir(baseDir: string, repoName: string): Promise<string | null> {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const candidates: string[] = [];
  for (const e of entries) {
    if (e.isDirectory() && (e.name === repoName || e.name.startsWith(repoName + "-"))) {
      candidates.push(path.join(baseDir, e.name));
    }
  }
  if (candidates.length === 0) return null;
  const stats = await Promise.all(candidates.map(async (p) => ({ p, s: await fs.stat(p) })));
  stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
  return stats[0]?.p ?? null;
}

function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

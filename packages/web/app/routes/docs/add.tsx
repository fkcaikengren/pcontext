import {  useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { alovaInstance } from "@/lib/alova"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { HttpError } from "@/lib/errors"

export default function AddDocsPage() {
  const [gitUrl, setGitUrl] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [gitError, setGitError] = useState("")
  const [websiteError, setWebsiteError] = useState("")
  const navigate = useNavigate()
  
  async function handleSubmit(source: "git" | "website") {
    const map: Record<string, string> = {
      git: gitUrl,
      website: websiteUrl,
    }
    const url = (map[source] || "").trim()
    if (!url) return

    if (source === "git") {
      setGitError("")
    } else {
      setWebsiteError("")
    }

    setSubmitting(true)
    try {
      const method = alovaInstance.Post<{ taskId: string }>("/docs/add", { url })
      const res = await method.send()
      toast.success("添加成功，开始索引文档")
      navigate(`/tasks/${res.taskId}`)
    } catch (err: any) {
      if (err instanceof HttpError && err.code === 409) {
        if (source === "git") {
          setGitError(`文档 ${err.data.slug} 已存在`)
        } else {
          setWebsiteError(`文档 ${err.data.slug} 已存在`)
        }
      } else {
        toast.error("系统异常，请稍后重试")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center p-4 pt-10">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>添加文档</CardTitle>
            <CardDescription>
              支持从 Git 仓库或网站地址创建文档索引
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="git" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="git">Git 仓库</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
              </TabsList>
              <TabsContent value="git">
                <DocsAddTabContent
                  placeholder="https://github.com/username/repo 或其他 Git 仓库地址"
                  description="支持 Github/Gitlab/Gitee 等，使用仓库地址或 git 地址（需要能支持 git clone）"
                  value={gitUrl}
                  onChange={(value) => {
                    setGitUrl(value)
                    if (gitError) setGitError("")
                  }}
                  onSubmit={() => handleSubmit("git")}
                  submitting={submitting}
                  error={gitError}
                />
              </TabsContent>
              <TabsContent value="website">
                <DocsAddTabContent
                  placeholder="Website URL"
                  description="输入网站地址"
                  value={websiteUrl}
                  onChange={(value) => {
                    setWebsiteUrl(value)
                    if (websiteError) setWebsiteError("")
                  }}
                  onSubmit={() => handleSubmit("website")}
                  submitting={submitting}
                  error={websiteError}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>提示</CardTitle>
            <CardDescription>添加文档前请先确认以下内容</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>只会读取 md/mdx 等文档</li>
              <li>系统会自动处理并索引文档内容</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type DocsAddTabContentProps = {
  placeholder: string
  description: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  error?: string
}

function DocsAddTabContent({ placeholder, description, value, onChange, onSubmit, submitting, error }: DocsAddTabContentProps) {
  return (
    <div className="grid gap-4 py-4">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex">
        <Button type="button" onClick={onSubmit} disabled={submitting || !value.trim()}>
          {submitting ? "提交中..." : "提交"}
        </Button>
      </div>
    </div>
  )
}

function deriveLibraryName(url: string, source: "git" | "website") {
  try {
    const u = new URL(url)
    if (source === "website") {
      const host = u.hostname.replace(/\./g, "-")
      const segments = u.pathname.split("/").filter(Boolean)
      const first = segments[0] || ""
      return first ? `${host}-${first}` : host
    }
    const segments = u.pathname.split("/").filter(Boolean)
    if (segments.length >= 2) {
      const owner = segments[0]
      let repo = segments[1]
      if (repo.endsWith(".git")) repo = repo.slice(0, -4)
      return `${owner}/${repo}`
    }
    return u.hostname
  } catch {
    return url
  }
}

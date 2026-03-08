import os from 'node:os'
import path from 'node:path'

const homeDir = os.homedir()         
export const APP_DATA_DIR = path.join(homeDir, '.pcontext')
export const DEFAULT_SQLITEDB_FILE_PATH = path.join(APP_DATA_DIR, 'pcontext.db')


export const TMP_GIT_REPOS_PATH = path.join(APP_DATA_DIR, "repos")
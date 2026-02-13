export type DocSnippetVO = {
  filePath: string
  content: string
  score?: number
}

export type DocSnippetsVO = {
  snippets: DocSnippetVO[]
}

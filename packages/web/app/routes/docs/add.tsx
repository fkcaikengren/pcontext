import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { client, parseRes, HttpError } from "@/APIs"
import { toast } from "sonner"
import { useNavigate } from "react-router"
import { useMutation } from "@tanstack/react-query"
import { buildInternalUrl } from "@/utils/router"
import { useUrlState } from "@/hooks/use-url-state"
import type { DocSourceEnumDTO } from "@/APIs"

type AddDocResponse = {
  name: string
  taskId: string
}

export default function AddDocsPage() {
  const [url, setUrl] = useState("")
  const [{ source }, setUrlState] = useUrlState({ source: 'github' as DocSourceEnumDTO })
  const [existingDoc, setExistingDoc] = useState<string>("")
  const [error, setError] = useState<string>("")
  const navigate = useNavigate()

  const addDocMutation = useMutation({
    mutationFn: async ({ url, source }: { url: string; source: DocSourceEnumDTO }) => {
      const res = client.docs.$post({ json: { url, source } })
      return parseRes(res)
    },
    onSuccess: (data: AddDocResponse) => {
      toast.success(`${data.name} 添加成功，开始索引文档`)
      navigate(`/tasks/${data.taskId}`)
    },
    onError: (error: HttpError) => {
      if (error.code === 409 ) {
        setExistingDoc(buildInternalUrl(`/docs/${error.data?.slug}`))
      } else {
        setError(error.message || "系统异常，请稍后重试")
      }
    },
  })

  function handleSubmit() {
    if (!url.trim()) return
    setExistingDoc('')
    setError('')
    addDocMutation.mutate({ url, source })
  }

  return (
    <div className="flex flex-1 flex-col items-center p-4 pt-10">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>添加文档</CardTitle>
            <CardDescription>
              支持从 GitHub、Gitee 仓库或网站地址创建文档索引
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={source} 
              onValueChange={(v) => {
                setUrlState({ source: v as DocSourceEnumDTO })
                setExistingDoc('')
                setError('')
              }} 
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="github">GitHub</TabsTrigger>
                <TabsTrigger value="gitee">Gitee</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
              </TabsList>
              <TabsContent value="github">
                <DocsAddTabContent
                  placeholder="https://github.com/username/repo"
                  description="使用 GitHub 仓库地址或 git 地址（需要能支持 git clone）"
                  value={url}
                  onChange={(value) => {
                    setUrl(value)
                    setExistingDoc('')
                  }}
                  onSubmit={handleSubmit}
                  submitting={addDocMutation.isPending}
                  existingDoc={existingDoc}
                  error={error}
                />
              </TabsContent>
              <TabsContent value="gitee">
                <DocsAddTabContent
                  placeholder="https://gitee.com/username/repo"
                  description="使用 Gitee 仓库地址或 git 地址（需要能支持 git clone）"
                  value={url}
                  onChange={(value) => {
                    setUrl(value)
                    setExistingDoc('')
                  }}
                  onSubmit={handleSubmit}
                  submitting={addDocMutation.isPending}
                  existingDoc={existingDoc}
                  error={error}
                />
              </TabsContent>
              <TabsContent value="website">
                <DocsAddTabContent
                  placeholder="Website URL"
                  description="URL 必须可公开访问，并指向官方文档。支持Base URL，如 https://example.com/docs 仅从 /docs 开始索引，这有利于爬虫爬取指定文档部分，避免索引整个网站。"
                  value={url}
                  onChange={(value) => {
                    setUrl(value)
                    setExistingDoc('')
                  }}
                  onSubmit={handleSubmit}
                  submitting={addDocMutation.isPending}
                  existingDoc={existingDoc}
                  error={error}
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
  existingDoc: string
  error: string
}

function DocsAddTabContent({ placeholder, description, value, onChange, onSubmit, submitting, existingDoc, error }: DocsAddTabContentProps) {
  return (
    <div className="grid gap-4 py-4">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex">
        <Button type="button" onClick={onSubmit} disabled={submitting || !value.trim()}>
          {submitting ? "提交中..." : "提交"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          {error}
        </div>
      )}
      
      {existingDoc && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span>文档</span>
          <a href={existingDoc} className="underline hover:text-destructive/80">
            {existingDoc}
          </a>
          <span>已存在！</span>
        </div>
      )}
    </div>
  )
}

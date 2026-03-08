import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { client, parseRes } from "@/APIs"
import { HttpError } from "@pcontext/shared"
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
    <div className="flex flex-1 flex-col items-center p-6 pt-16 md:p-8 md:pt-20">
      <div className="w-full max-w-2xl">
       

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="pt-6">
            <Tabs
              value={source}
              onValueChange={(v) => {
                setUrlState({ source: v as DocSourceEnumDTO })
                setExistingDoc('')
                setError('')
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-lg border border-border/50">
                <TabsTrigger
                  value="github"
                  className="rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                >
                  GitHub
                </TabsTrigger>
                <TabsTrigger
                  value="gitee"
                  className="rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                >
                  Gitee
                </TabsTrigger>
                <TabsTrigger
                  value="website"
                  className="rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                >
                  Website
                </TabsTrigger>
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

        <Card className="mt-8 border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">提示</CardTitle>
            <CardDescription className="mt-1.5">添加文档前请先确认以下内容</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed">
              {source === "website" ? (
                <li>采用爬虫转 markdown 然后进行索引</li>
              ) : (
                <>
                  <li>只会读取 md/mdx 等文档</li>
                  <li>系统会自动处理并索引文档内容</li>
                </>
              )}
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
    <div className="grid gap-5 py-5">
      <div className="space-y-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
        />
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <div className="flex">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !value.trim()}
          className="transition-all duration-200 ease-in-out active:scale-[0.98]"
        >
          {submitting ? "提交中..." : "提交"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {existingDoc && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 px-3 py-2 rounded-md">
          <span>文档</span>
          <a href={existingDoc} className="underline hover:text-destructive/80 transition-colors">
            {existingDoc}
          </a>
          <span>已存在！</span>
        </div>
      )}
    </div>
  )
}

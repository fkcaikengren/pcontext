import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

import type { TaskStatus } from "@pcontext/shared/types"

export interface DocInfoCardProps {
  title: string
  url?: string
  description?: string
  status?: TaskStatus
  labels?: string[]
}

const statusLabel = (status: TaskStatus | undefined) => {
  if (status === "running") return "进行中"
  if (status === "completed") return "已完成"
  if (status === "failed") return "失败"
  return ""
}

const statusClassName = (status: TaskStatus | undefined) => {
  if (status === "running")
    return "rounded-full border border-blue-200 bg-blue-50 text-blue-700 gap-1 hover:bg-blue-50"
  if (status === "completed")
    return "rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 gap-1 hover:bg-emerald-50"
  if (status === "failed")
    return "rounded-full border border-red-200 bg-red-50 text-red-700 gap-1 hover:bg-red-50"
  return "rounded-full border border-slate-200 bg-slate-50 text-slate-600 gap-1 hover:bg-slate-50"
}

export function DocInfoCard({ title, url, description, status, labels }: DocInfoCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-2xl font-semibold text-slate-700">
            {title}
          </CardTitle>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-slate-500 underline underline-offset-2 decoration-slate-300 hover:text-slate-700"
            >
              {url}
            </a>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            <Badge className={statusClassName(status)}>
              {status === "running" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {status === "completed" && (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {status === "failed" && (
                <AlertCircle className="h-3 w-3" />
              )}
              <span>{statusLabel(status)}</span>
            </Badge>
          )}
          {labels?.map((label, index) => (
            <Badge
              key={index}
              variant="outline"
              className="inline-flex items-center gap-1 rounded-full border-slate-200 bg-slate-50 text-xs font-normal text-slate-600"
            >
              <span>{label}</span>
            </Badge>
          ))}
        </div>
      </CardHeader>
    </Card>
  )
}

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"

import type { TaskStatus } from "@pcontext/api/client"

export interface TaskStatusBadgeProps {
  status: TaskStatus
  className?: string
}

const statusConfig = (status: TaskStatus) => {
  if (status === "running") {
    return {
      label: "进行中",
      className: "border-orange-300 text-orange-600 bg-orange-50/50",
      icon: Loader2,
    }
  }
  if (status === "completed") {
    return {
      label: "已完成",
      className: "border-emerald-300 text-emerald-600 bg-emerald-50/50",
      icon: CheckCircle2,
    }
  }
  if (status === "failed") {
    return {
      label: "失败",
      className: "border-red-300 text-red-600 bg-red-50/50",
      icon: AlertCircle,
    }
  }
  return {
    label: "未知",
    className: "border-muted-foreground/30 text-muted-foreground bg-muted/30",
    icon: AlertCircle,
  }
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig(status)
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={`inline-flex gap-1 rounded-full border ${config.className} ${className ?? ""}`}
    >
      {status === "running" && <Icon className="h-3 w-3 animate-spin" />}
      {status === "completed" && <Icon className="h-3 w-3" />}
      {status === "failed" && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
    </Badge>
  )
}

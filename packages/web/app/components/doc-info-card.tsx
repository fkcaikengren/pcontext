import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TaskStatusBadge } from "./task-status-badge"

import type { TaskStatus } from "@pcontext/api/client"

export interface DocInfoCardProps {
  title: string
  url?: string
  description?: string
  status?: TaskStatus
  labels?: string[]
}

export function DocInfoCard({ title, url, description, status, labels }: DocInfoCardProps) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </CardTitle>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block text-sm text-muted-foreground underline underline-offset-2 decoration-border hover:text-foreground transition-colors duration-200"
            >
              {url}
            </a>
          )}
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status && <TaskStatusBadge status={status} />}
          {labels?.map((label, index) => (
            <Badge
              key={index}
              variant="outline"
              className="inline-flex items-center gap-1 rounded-full border-border/60 bg-muted/50 text-xs font-normal text-muted-foreground hover:bg-muted transition-colors duration-200"
            >
              <span>{label}</span>
            </Badge>
          ))}
        </div>
      </CardHeader>
    </Card>
  )
}

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router"
import { client, parseRes } from "@/APIs"
import type { TaskVO } from '@pcontext/api/client'
import { TaskStatusBadge } from "@/components/task-status-badge"
import { ListTodo, ExternalLink } from "lucide-react"

function formatDate(timestamp: number): string {
  if (!timestamp) return "-"
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskVO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchTasks = async () => {
      setLoading(true)
      setError(null)
      try {
        const { tasks } = await parseRes(client.tasks.$get())
        if (cancelled) return
        setTasks(tasks || [])
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : "加载任务失败"
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTasks()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center p-6 pt-16 md:p-8 md:pt-20">
      <div className="w-full max-w-5xl">

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg font-medium">任务列表</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="py-12 text-center text-sm text-muted-foreground">加载中...</div>
            )}
            {!loading && error && (
              <div className="py-4 px-4 rounded-md bg-destructive/5 text-sm text-destructive">
                {error}
              </div>
            )}
            {!loading && !error && tasks.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无任务</div>
            )}
            {!loading && !error && tasks.length > 0 && (
              <div className="flex flex-col divide-y divide-border/50">
                {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between py-4 hover:bg-muted/30 transition-colors -mx-4 px-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {(task.extraData as any)?.name}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <TaskStatusBadge status={task.status} />
                          <span className="text-xs text-muted-foreground">
                            创建时间: {formatDate(task.createdAt)}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild className="ml-4 transition-all duration-200 ease-in-out hover:bg-accent active:scale-[0.98]">
                        <Link to={`/tasks/${task.id}`}>
                          查看日志
                        </Link>
                      </Button>
                    </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

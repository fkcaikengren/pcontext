import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router"
import { client, parseRes } from "@/APIs"
import type { TaskVO } from '@pcontext/api/client'

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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>任务列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y">
              {loading && (
                <div className="py-3 text-sm text-muted-foreground">加载中...</div>
              )}
              {!loading && error && (
                <div className="py-3 text-sm text-destructive">{error}</div>
              )}
              {!loading && !error && tasks.length === 0 && (
                <div className="py-3 text-sm text-muted-foreground">暂无任务</div>
              )}
              {!loading && !error &&
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium">{(task.extraData as any)?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        状态: {task.status} · 创建时间: {formatDate(task.createdAt)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/tasks/${task.id}`}>查看日志</Link>
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

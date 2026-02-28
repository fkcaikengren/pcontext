import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"
import { CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DocInfoCard } from "@/components/doc-info-card"
import { TaskStatusBadge } from "@/components/task-status-badge"
import { client, parseRes } from "@/APIs"
import { formatDateTime } from "@/utils/format"
import type { TaskVO } from '@pcontext/api/client'

type TaskLogEntry = TaskVO['logs'][number]

export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>()
  const taskId = params.taskId
  const [task, setTask] = useState<TaskVO | null>(null)
  const [taskLoading, setTaskLoading] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [lines, setLines] = useState<TaskLogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!taskId) return

    let cancelled = false
    setTask(null)
    setTaskError(null)
    setLines([])
    setError(null)
    setTaskLoading(true)

    const fetchTask = async () => {
      try {
        const { task } = await parseRes(client.tasks[':id'].$get({ param: { id: taskId } }))
        if(!task) return
        if (cancelled) return
        setTask(task)
        if(task.status !== 'running'){
          setLines(task.logs ?? [])
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : "加载任务详情失败"
        setTaskError(message)
      } finally {
        if (!cancelled) setTaskLoading(false)
      }
    }

    void fetchTask()

    return () => {
      cancelled = true
    }
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    if (!task) return
    if (task.status !== "running") return

		const baseUrl = `${import.meta.env.VITE_BASE_URL}/api/tasks/${taskId}/progress`
		const es = new EventSource(baseUrl)

    es.onmessage = (event) => {
			const raw = event.data ?? ""
			if (!raw) return
			try {
				const parsed = JSON.parse(raw) as TaskLogEntry[] | TaskLogEntry
				const entries = Array.isArray(parsed) ? parsed : [parsed]
				if (entries.length === 0) return
				setLines((prev) => [...prev, ...entries])

        console.log('message日志：-------------', entries)
			} catch {
				setError("日志数据解析失败")
			}
    }

    es.addEventListener("error", () => {
      setError("任务不存在或已过期")
      es.close()
    })

    es.addEventListener("end", () => {
      es.close()
      // 修改状态为已完成
      setTask({...task, status: "completed"})
    })

    es.onerror = () => {
      setError("连接中断")
    }

    return () => {
      es.close()
    }
  }, [taskId, task])

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTop = containerRef.current.scrollHeight
  }, [lines.length])

  const taskName = (task?.extraData as any)?.name ?? (taskId ? `任务 #${taskId}` : "任务")
  const taskUrl = (task?.extraData as any)?.url ?? ''
  const createdAtText = task?.createdAt ? formatDateTime(new Date(task.createdAt), "yyyy-MM-dd HH:mm:ss") : ""

  const isTaskNotFound = !task && !taskLoading && !!taskError

  return (
    <div className="flex flex-1 flex-col items-center p-6 pt-16 md:p-8 md:pt-20">
      <div className="w-full max-w-5xl space-y-6">
        {isTaskNotFound && (
          <Alert variant="destructive" className="border-destructive/60">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>任务不存在</AlertTitle>
          </Alert>
        )}
        {!isTaskNotFound && (
          <>
            <DocInfoCard
              title={taskName}
              url={taskUrl}
              status={taskLoading ? "running" : task?.status}
              labels={createdAtText ? [`创建时间: ${createdAtText}`] : undefined}
            />
            {taskError && (
              <div className="text-sm text-destructive bg-destructive/5 px-4 py-3 rounded-md">
                {taskError}
              </div>
            )}

            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">任务日志</CardTitle>
                  {task?.status && (
                    <TaskStatusBadge status={task.status} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task?.status === "completed" && (
                      <div>
                        <Alert className="border-emerald-300/60 bg-emerald-50/50 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertTitle>任务已完成</AlertTitle>
                          <AlertDescription>
                            日志已完整输出，你可以安全关闭此页面。
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/5 px-4 py-3 rounded-md">
                      {error}
                    </div>
                  )}
                <div
                  ref={containerRef}
                  className="h-96 w-full overflow-y-auto rounded-lg border border-border/60 bg-zinc-950 p-4 font-mono text-xs"
                >
                  {lines.map((entry, index) => {
                    const parts: string[] = []
                    parts.push(formatDateTime(new Date(entry.timestamp)))
                    parts.push(entry.level.toUpperCase())
                    if (entry.message && entry.message.length > 0) {
                      parts.push(entry.message)
                    }
                    if (entry.data !== undefined) {
                      try {
                        parts.push(JSON.stringify(entry.data))
                      } catch {}
                    }
                    if (parts.length === 0) {
                      return (
                        <div key={index} />
                      )
                    }
                    const [first, ...rest] = parts
                    const contentClassName = entry.level === "error"
                      ? "text-red-400"
                      : entry.level === "warn"
                        ? "text-yellow-400"
                        : "text-green-400"
                    return (
                      <div key={index} className="leading-relaxed">
                        <span className="text-zinc-500">{first}</span>
                        {rest.length > 0 && rest.map((part, partIndex) => (
                          <span key={partIndex} className={contentClassName}>
                            {" | "}
                            {part}
                          </span>
                        ))}
                      </div>
                    )
                  })}
                </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DocInfoCard } from "@/components/doc-info-card"
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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-10">
      <div className="w-full max-w-4xl space-y-4">
        {isTaskNotFound && (
          <Alert variant="destructive">
            <AlertCircle />
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
              <div className="mt-1 text-xs text-red-500">{taskError}</div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>
                  任务日志
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {task?.status === "completed" && (
                      <div className="mb-3">
                        <Alert className="border-emerald-500/60 bg-emerald-500/10 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <div>
                            <AlertTitle>任务已完成</AlertTitle>
                            <AlertDescription>
                              日志已完整输出，你可以安全关闭此页面。
                            </AlertDescription>
                          </div>
                        </Alert>
                      </div>
                    )}
                  {error && (
                    <div className="text-red-400">{error}</div>
                  )}
                <div
                  ref={containerRef}
                  className="mt-2 h-96 w-full overflow-y-auto rounded-md bg-black p-3 font-mono text-xs text-green-300"
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
                        : "text-green-300"
                    return (
                      <div key={index}>
                        <span className="text-slate-400">{first}</span>
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

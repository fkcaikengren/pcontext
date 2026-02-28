import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { ArrowUpDown, Search, Filter, FileText, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { client, parseRes } from "@/APIs"
import type { DocVO, DocSourceEnumDTO } from '@pcontext/api/client'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

type DocSource = "all" | DocSourceEnumDTO



function normalizeDate(value: string | number): number {
  if (typeof value === "number") return value
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return 0
  return parsed
}

function formatDate(timestamp: number | string): string {
  if (!timestamp) return "-"
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

export default function DocsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [name, setName] = useState("")
  const [source, setSource] = useState<"all" | DocSource>("all")
  const [updatedFrom, setUpdatedFrom] = useState("")
  const [updatedTo, setUpdatedTo] = useState("")
  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true },
  ])

  useEffect(() => {
    setPage(1)
  }, [name, source, updatedFrom, updatedTo, pageSize])

  const query = useQuery({
    queryKey: ['docs', 'list', { page, pageSize, name, source, updatedFrom, updatedTo }],
    queryFn: async () => {
      const queryParams: any = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      }
      const trimmedName = name.trim()
      if (trimmedName) queryParams.name = trimmedName
      if (source !== 'all') queryParams.source = source
      if (updatedFrom) {
        const t = new Date(updatedFrom).getTime()
        if (!Number.isNaN(t)) queryParams.updatedFrom = t.toString()
      }
      if (updatedTo) {
        const t = new Date(updatedTo).getTime()
        if (!Number.isNaN(t)) queryParams.updatedTo = t.toString()
      }

      return parseRes(client.docs.$get({ query: queryParams }))
    },
    placeholderData: keepPreviousData,
  })

  const data = query.data
  const loading = query.isPending
  const error = query.error?.message

  const rows = data?.list ?? []

  const columns = useMemo<ColumnDef<DocVO>[]>(
    () => [
      {
        accessorKey: "name",
        header: "名称",
        cell: (info) => (
          <div className="text-sm font-medium text-foreground">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: "source",
        header: "来源",
        cell: (info) => {
          const value = info.getValue<DocSourceEnumDTO>()
          if (value === "github") return <span className="text-sm">GitHub</span>
          if (value === "gitee") return <span className="text-sm">Gitee</span>
          if (value === "website") return <span className="text-sm">网站</span>
          return <span className="text-sm">{value}</span>
        },
      },
      {
        accessorKey: "url",
        header: "URL",
        cell: (info) => {
          const value = info.getValue<string>()
          return (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-1 text-sm text-muted-foreground underline underline-offset-2 decoration-border hover:text-foreground transition-colors"
            >
              {value}
            </a>
          )
        },
      },
      {
        accessorKey: "snippets",
        header: "片段",
        cell: (info) => <span className="text-sm text-foreground">{info.getValue<number>()}</span>,
      },
      {
        accessorKey: "tokens",
        header: "Token",
        cell: (info) => <span className="text-sm text-foreground">{formatNumber(info.getValue<number>())}</span>,
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            更新时间
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(info.row.original.updatedAt)}
          </span>
        ),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.updatedAt
          const b = rowB.original.updatedAt
          if (a === b) return 0
          return a < b ? -1 : 1
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" asChild className="transition-all duration-200 ease-in-out hover:bg-accent active:scale-[0.98]">
              <Link to={`/docs/${row.original.slug}`}>
                <ExternalLink className="w-3 h-3 mr-1" />
                查看
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  })

  const totalPages = data?.totalPages ?? 1
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="flex flex-1 flex-col items-center p-6 pt-16 md:p-8 md:pt-20">
      <div className="w-full max-w-5xl">

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg font-medium">文档列表</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-1 flex-col gap-2 md:max-w-sm">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  按名称搜索
                </div>
                <Input
                  placeholder="输入文档名称"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                />
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    来源
                  </div>
                  <select
                    value={source}
                    onChange={(event) => setSource(event.target.value as "all" | DocSource)}
                    className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                  >
                    <option value="all">全部</option>
                    <option value="github">GitHub</option>
                    <option value="gitee">Gitee</option>
                    <option value="website">网站</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">更新时间范围</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={updatedFrom}
                      onChange={(event) => setUpdatedFrom(event.target.value)}
                      className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                    />
                    <span className="text-xs text-muted-foreground">至</span>
                    <input
                      type="date"
                      value={updatedTo}
                      onChange={(event) => setUpdatedTo(event.target.value)}
                      className="h-10 rounded-md border border-border/60 bg-background px-3 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Table */}
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50 border-b border-border/60">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30 border-b border-border/30 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="align-middle py-3">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div>
                共 {data?.total ?? 0} 条记录，第 {data?.page ?? page} / {totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">每页</span>
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number.parseInt(event.target.value, 10) || 10)
                  }
                  className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canPrev || loading || query.isFetching}
                  onClick={() => canPrev && setPage((prev) => prev - 1)}
                  className="h-8 px-3 transition-all duration-200 ease-in-out hover:bg-accent active:scale-[0.98]"
                >
                  上一页
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canNext || loading || query.isFetching}
                  onClick={() => canNext && setPage((prev) => prev + 1)}
                  className="h-8 px-3 transition-all duration-200 ease-in-out hover:bg-accent active:scale-[0.98]"
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

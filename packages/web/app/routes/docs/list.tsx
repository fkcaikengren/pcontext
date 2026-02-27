import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { ArrowUpDown } from "lucide-react"
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
          <div className="text-sm font-medium">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: "source",
        header: "来源",
        cell: (info) => {
          const value = info.getValue<DocSourceEnumDTO>()
          if (value === "github") return "GitHub"
          if (value === "gitee") return "Gitee"
          if (value === "website") return "网站"
          return value
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
              className="line-clamp-1 text-gray-500 underline"
            >
              {value}
            </a>
          )
        },
      },
      {
        accessorKey: "snippets",
        header: "片段",
        cell: (info) => <span>{info.getValue<number>()}</span>,
      },
      {
        accessorKey: "tokens",
        header: "Token",
        cell: (info) => <span>{formatNumber(info.getValue<number>())}</span>,
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium"
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
            <Button size="sm" variant="outline" asChild>
              <Link to={`/docs/${row.original.slug}`}>查看</Link>
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
    <div className="flex flex-1 flex-col items-center p-4 pt-10">
      <div className="w-full max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>文档列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-1 flex-col gap-2 md:max-w-sm">
                <div className="text-xs text-muted-foreground">按名称搜索</div>
                <Input
                  placeholder="输入文档名称"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-8"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">来源</div>
                  <select
                    value={source}
                    onChange={(event) => setSource(event.target.value as "all" | DocSource)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">至</span>
                    <input
                      type="date"
                      value={updatedTo}
                      onChange={(event) => setUpdatedTo(event.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap">
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
                        className="h-24 text-center text-sm"
                      >
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="align-middle">
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

            <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div>
                共 {data?.total ?? 0} 条记录，第 {data?.page ?? page} / {totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <span>每页</span>
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number.parseInt(event.target.value, 10) || 10)
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
                  className="h-8 px-3"
                >
                  上一页
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canNext || loading || query.isFetching}
                  onClick={() => canNext && setPage((prev) => prev + 1)}
                  className="h-8 px-3"
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

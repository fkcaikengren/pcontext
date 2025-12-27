import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function UsersPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="w-full max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>用户管理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">后续可以接入 /api/admin/users 列表接口</div>
              <Button size="sm">新建用户</Button>
            </div>
            <div className="rounded-md border text-sm text-muted-foreground p-4">
              用户列表占位区域，包含用户名、角色、状态等信息。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


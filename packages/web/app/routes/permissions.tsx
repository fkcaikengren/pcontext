import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PermissionsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="w-full max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>权限管理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>这里可以基于 Casbin 的角色和策略管理页面路由、按钮等权限。</div>
              <div>后续可以接入 /api/admin/roles 等接口，展示角色与策略配置。</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


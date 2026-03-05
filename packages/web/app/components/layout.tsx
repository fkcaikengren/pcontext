import { useEffect, useLayoutEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Outlet, useLocation, useNavigate } from "react-router"
import { useAuthStore } from "@/stores/auth"
import { checkRoutePermission } from "@/permissions"

function AppLayout() {


  const {loading, initialized, auth} = useAuthStore((state) => state);
  const location = useLocation();
  const navigate = useNavigate();

  // 初始化用户信息
  useEffect(() => {
    if (!initialized) {
      auth();
    }
  }, [initialized, auth]);

  // 路由守卫：检查权限
  useLayoutEffect(() => {
    const { user, isAuthenticated } = useAuthStore.getState();
    const hasPermission = checkRoutePermission(
      location.pathname,
      user?.role,
      isAuthenticated
    );

    if (!hasPermission) {
      navigate(isAuthenticated ? "/" : "/login");
    }
  }, [location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="sidebar" collapsible="icon" />
      <SidebarInset>
        <main>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


export default AppLayout
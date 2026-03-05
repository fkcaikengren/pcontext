import { useEffect, useLayoutEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Outlet, useLocation, useNavigate } from "react-router"
import { useAuthStore } from "@/stores/auth"
import { Toaster } from "@/components/ui/sonner"
import { checkRoutePermission } from "@/permissions"

export default function AppLayout() {
  const setUser = useAuthStore((state) => state.setUser);
  const initialized = useAuthStore((state) => state.initialized);
  const location = useLocation();
  const navigate = useNavigate();

  // 客户端获取用户信息
  useLayoutEffect(() => {
    if (initialized) return;

    const fetchUser = async () => {
      const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
      const apiUrl = `${baseUrl}/api/users/me`;

      try {
        const response = await fetch(apiUrl, {
          credentials: 'include',
        });

        if (response.ok) {
          const res = await response.json();
          const user = res.data;
          const userRole = user?.role;
          const isAuthenticated = (userRole ?? 'guest') !== 'guest';
          setUser(user, isAuthenticated);
        } else {
          setUser(null, false);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null, false);
      }
    };

    fetchUser();
  }, [initialized, setUser]);

  // 路由守卫：检查权限
  useEffect(() => {
    const {user, isAuthenticated} = useAuthStore.getState(); // 直接从 store 获取最新状态
    const hasPermission = checkRoutePermission(
      location.pathname,
      user?.role,
      isAuthenticated
    );

    if (!hasPermission) {
      navigate(isAuthenticated ? "/" : "/login");
    }
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <AppSidebar variant="sidebar" collapsible="icon" />
      <SidebarInset>
        <main>
          <Outlet />
        </main>

      </SidebarInset>
    </SidebarProvider>
  )
}

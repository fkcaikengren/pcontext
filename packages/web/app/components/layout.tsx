import { useEffect,useLayoutEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Outlet, useLocation, useNavigate, useLoaderData } from "react-router"
import { useAuthStore } from "@/stores/auth"
import { Toaster } from "@/components/ui/sonner"
import { checkRoutePermission } from "@/permissions"
import type { LoaderFunctionArgs } from "react-router"
import type { UserRole } from "@/stores/auth"

/**
 * 服务端 loader：在渲染前获取用户信息
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/users/me`;

  try {
    const headers = new Headers();
    const cookie = request.headers.get("Cookie");
    if (cookie) {
      headers.set("Cookie", cookie);
    }

    const response = await fetch(apiUrl, {
      headers,
      credentials: 'include',
    });

    if (response.ok) {
      const res = await response.json();
      const user = res.data;
      const userRole = user?.role as UserRole | undefined;
      const isAuthenticated = (userRole ?? 'guest') !== 'guest';

      return { user, isAuthenticated, initialized: true };
    }
  } catch (error) {
    console.error('Failed to fetch user in loader:', error);
  }

  return { user: null, isAuthenticated: false, initialized: true };
}

export default function AppLayout() {
  const { user, isAuthenticated } = useLoaderData<typeof loader>();

  // 将服务端获取的用户信息同步到 store

  const setUser = useAuthStore((state) => state.setUser);
  const initialized = useAuthStore((state) => state.initialized);
  const location = useLocation();
  const navigate = useNavigate();

  // 只有在 store 未初始化时才同步 loader 数据（首次挂载 hydration）
  useLayoutEffect(() => {
    // console.log('Loader data:', { user, isAuthenticated, initialized });
    if (!initialized) {
      setUser(user, isAuthenticated);
    }
  }, []);

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

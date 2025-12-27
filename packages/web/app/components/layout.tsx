import { useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Outlet } from "react-router"
import { useAuthStore } from "@/stores/auth"
import { Toaster } from "@/components/ui/sonner"

export default function AppLayout() {
  const fetchMe = useAuthStore((state) => state.fetchMe)

  useEffect(() => {
    void fetchMe()
  }, [fetchMe])

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

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/stores/auth"
import { Link, useLocation, useNavigate } from "react-router"
import { 
  BookOpen, 
  Settings, 
  LogOut, 
  ChevronsUpDown,
  Home,
  FileText,
  PanelLeft,
  ListTodo,
  Users,
  ShieldCheck
} from "lucide-react"

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleSidebar } = useSidebar()

  const menuItems = [
    {
      title: "首页",
      url: "/",
      icon: Home,
    },
    {
      title: "文档列表",
      url: "/docs",
      icon: BookOpen,
    },
    {
      title: "添加文档",
      url: "/add-docs",
      icon: FileText,
    },
    {
      title: "任务列表",
      url: "/tasks",
      icon: ListTodo,
    },
    {
      title: "用户管理",
      url: "/users",
      icon: Users,
    },
    {
      title: "权限管理",
      url: "/permissions",
      icon: ShieldCheck,
    },
    {
      title: "应用设置",
      url: "/pcontext-setting",
      icon: Settings,
    },
  ]

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const routes = user?.permissions?.routes

  const hasRouteAccess = (path: string) => {
    if (!routes) return true
    if (routes[path]) return true

    for (const [pattern, allowed] of Object.entries(routes)) {
      if (!allowed) continue
      if (!pattern.endsWith("*")) continue
      const prefix = pattern.slice(0, -1)
      if (path.startsWith(prefix)) return true
    }

    return false
  }

  const filteredItems = menuItems.filter((item) => hasRouteAccess(item.url))

  return (
    <Sidebar 
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between">
            <SidebarMenuButton size="lg" asChild className="group-data-[collapsible=icon]:hidden">
              <Link to="/">
                <img src="/assets/logo.png" alt="PContext Logo" className="inline-block w-32" />
              </Link>
            </SidebarMenuButton>
            
            <button onClick={toggleSidebar} className="p-2 hover:bg-sidebar-accent rounded-md cursor-pointer group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                 <PanelLeft className="size-4 " />
            </button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          {/* <SidebarGroupLabel>Menu</SidebarGroupLabel> */}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="rounded-lg">
                      {user?.name?.substring(0, 2).toUpperCase() || "GU"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || "Guest User"}</span>
                    <span className="truncate text-xs">{user?.role || "Visitor"}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                {!user ? (
                  <>
                    <DropdownMenuItem onClick={()=>{
                      navigate("/login")
                    }}>
                      去登录
                    </DropdownMenuItem>
                    
                  </>
                ) : (
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 size-4" />
                      退出登录
                    </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

import type { UserRole } from "@/stores/auth";

/**
 * 路由权限配置
 * - public: 公开访问
 * - authenticated: 需要登录
 * - role: 指定角色才能访问
 */
export type RoutePermission =
  | { type: "public" }
  | { type: "authenticated" }
  | { type: "role"; role: UserRole };

/**
 * 路由配置元数据
 */
export interface RouteMeta {
  /** 路由路径 */
  path: string;
  /** 权限配置 */
  permission: RoutePermission;
  /** 菜单标题（用于侧边栏） */
  title?: string;
  /** 菜单图标组件名称 */
  icon?: string;
}

/**
 * 所有受保护路由的权限配置
 * key 为路由路径（不含前缀 /）
 */
export const routePermissions: Record<string, RouteMeta> = {
  "": {
    path: "/",
    permission: { type: "public" },
    title: "首页",
    icon: "Home",
  },
  docs: {
    path: "/docs",
    permission: { type: "public" },
    title: "文档列表",
    icon: "BookOpen",
  },
  "docs/:docSlug": {
    path: "/docs/:docSlug",
    permission: { type: "public" },
  },
  "add-docs": {
    path: "/add-docs",
    permission: { type: "public" },
    // permission: { type: "role", role: "admin" },
    title: "添加文档",
    icon: "FileText",
  },
  tasks: {
    path: "/tasks",
    permission: { type: "authenticated" },
    title: "任务列表",
    icon: "ListTodo",
  },
  "tasks/:taskId": {
    path: "/tasks/:taskId",
    permission: { type: "authenticated" },
  },
  users: {
    path: "/users",
    permission: { type: "role", role: "admin" },
    title: "用户管理",
    icon: "Users",
  },
  permissions: {
    path: "/permissions",
    permission: { type: "role", role: "admin" },
    title: "权限管理",
    icon: "ShieldCheck",
  },
  profile: {
    path: "/profile",
    permission: { type: "authenticated" },
  },
};

/**
 * 登录页单独配置（不在 layout 中）
 */
export const loginRouteMeta: RouteMeta = {
  path: "/login",
  permission: { type: "public" },
};

/**
 * 检查用户是否有权限访问路由
 */
export function checkRoutePermission(
  path: string,
  userRole: UserRole | undefined,
  isAuthenticated: boolean
): boolean {
  // 获取路由配置（支持动态路由匹配）
  const meta = matchRouteMeta(path);
  if (!meta) return true; // 未配置的路由默认放行

  const { permission } = meta;

  switch (permission.type) {
    case "public":
      return true;
    case "authenticated":
      return isAuthenticated;
    case "role":
      return isAuthenticated && userRole === permission.role;
    default:
      return true;
  }
}

/**
 * 根据路径匹配路由配置
 * 支持动态路由如 docs/:docSlug -> docs/xxx
 */
function matchRouteMeta(path: string): RouteMeta | undefined {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  // 精确匹配
  if (routePermissions[normalizedPath]) {
    return routePermissions[normalizedPath];
  }

  // 动态路由匹配
  for (const [key, meta] of Object.entries(routePermissions)) {
    if (key.includes(":")) {
      const pattern = key.replace(/:[^/]+/g, "[^/]+");
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(normalizedPath)) {
        return meta;
      }
    }
  }

  return undefined;
}

/**
 * 获取用户角色可访问的菜单项
 */
export function getAccessibleRoutes(userRole: UserRole | undefined, isAuthenticated: boolean): RouteMeta[] {
  return Object.values(routePermissions).filter((meta) => {
    return checkRoutePermission(meta.path, userRole, isAuthenticated);
  });
}

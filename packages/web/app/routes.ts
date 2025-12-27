import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
	route("login", "routes/login.tsx"),
	layout("components/layout.tsx", [
		index("routes/home.tsx"),
		route("docs", "routes/docs/list.tsx"),
		route("docs/:docId", "routes/docs/detail.tsx"),
		route("add-docs", "routes/docs/add.tsx"),
		route("tasks", "routes/tasks/list.tsx"),
		route("tasks/:taskId", "routes/tasks/detail.tsx"),
		route("users", "routes/users.tsx"),
		route("permissions", "routes/permissions.tsx"),
		route("pcontext-setting", "routes/pcontext-setting.tsx"),
		route("profile", "routes/profile.tsx"),
	]),
] satisfies RouteConfig;

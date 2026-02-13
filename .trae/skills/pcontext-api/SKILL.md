---
name: packages/api 项目开发规范
description: pcontext项目的 packages/api 子项目的项目结构规范、代码规范和运行等操作规范。修改该子项目需要遵循这些规范。
---

## 数据库 
支持本地的SQLite数据库，也支持远程的Postgrel数据库。使用了 drizzle-orm 来控制数据库操作。


## 项目结构
DDD-lite 开发规范
/modules
|-doc
	|-doc.vo.ts 
	|-doc.dto.ts (请求入参，基于zod，infer type类型)
	|-doc.route.ts
	|-doc.service.ts (获取repo，传参，做一个统一依赖容器，比如定一个全局RepoDeps)
	|-doc.repo.interface.ts
	|-doc.entity.ts
	|-infrastructure
		|-doc.repo.sqlite.ts
		|-doc.repo.pg.ts （drizzle推断的类型就是 PO， 另外自己建一个Entity）
		
		

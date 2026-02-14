---
name: packages/api 项目开发规范
description: pcontext项目的 packages/api 子项目的项目结构规范、代码规范和运行等操作规范。修改该子项目需要遵循这些规范。
---


## when to apply
当修改一个API接口，修改数据库字段，定义或修改数据结构、增加新的pcontext后端逻辑.

## 项目结构
DDD-lite 开发规范
/modules
|-doc
	|-doc.vo.ts (vo类型，用于返回给前端的类型)
	|-doc.dto.ts (请求入参，基于zod，infer type类型)
	|-doc.route.ts (路由层)
	|-doc.service.ts (获取repo，传参，做一个统一依赖容器，比如定一个全局RepoDeps)
	|-doc.repo.interface.ts 
	|-doc.entity.ts
	|-infrastructure
		|-doc.po.ts （存放表达schema）
		|-doc.repo.sqlite.ts
		|-doc.repo.pg.ts 
		
		

## 数据结构规范 - PO, Entity, DTO, VO
4种数据结构
PO 对应表结果，由drizzle-orm 推断得到。PO 应该命名带`PO`后缀；
Entity 对应领域模型，用于业务逻辑处理，repo不直接返回PO，而是返回Entity。Entity 应该命名带`Entity`后缀；
DTO 对应前端HTTP请求传的参数类型，可以复用到service和repo。DTO 应该命名带`DTO`后缀；
VO 对应页面展示类型。VO 应该命名带`VO`后缀；


数据结构流转逻辑：
- 在repo中每个方法处理的PO应该转换为Entity，在route中处理的Entity应该转换为VO。
- 前端HTTP请求传的参数类型（DTO）可以复用到service和repo，用于参数校验和转换。
- 页面展示类型（VO）可以复用到前端，用于展示数据。对于复杂结构有必要在`c.json()`时应该显示指明VO类型。
    

## 数据库和infrastructure规范
1. 当设计/修改`xxx`模块时，应该遵循下面的流程规范：
- 先定义/修改表结构，`xxx.po.ts`，同步修改sqlite/Postgrel的表结构。
- 定义/修改 `xxx.repo.interface.ts`，对于用到的数据结构，在`xxx.entity.ts`定义/修改Entity、在`xxx.dto.ts`定义/修改DTO。
- 根据interface.ts 实现接口，包括sqlite和Postgrel的实现，修改`xxx.repo.sqlite.ts`和`xxx.repo.pg.ts`。


2. 外部的route,service或者其他业务逻辑，通过getRepoDeps().xxxRepo 来获取repo。

## API接口和HTTP响应规范

当修改某个模块的`xxx.route.ts`时，json响应采用 ApiSuccess/ApiError 响应，并且使用ResXxx构造响应结果，举例如下。
正确：
```ts
c.json(Res200(doc) as ApiSuccess<CreateDocDTO>, 200)
```
错误：
```ts
c.json({ code: 200, message: '', data: doc }, 200)
```

### 已知问题

TS 报错 和`ApiSuccess`/`ApiSuccess<null>`/`ApiError` 相关，考虑一下原因：
1.ApiSuccess是不是没有传入泛型，应该是`ApiSuccess<TheTypeVO>`，`TheTypeVO`应该是基于service层/repository层的Entity转换 而来

比如：
```ts
c.json(Res200(result) as ApiSuccess, 200)
```

应该根据 `result` 找到对应的PO，然后转换或重新一个VO类型，假设为TheTypeVO，改造如下：
```ts
// xxx.route.ts
c.json(Res200(result) as ApiSuccess, 200)
```

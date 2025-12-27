

## RBAC 权限控制

基于casbin库做RBAC。

Casbin 本身是一个强大的**访问控制库**，它支持多种访问控制模型（如 ACL、RBAC、ABAC 等）。Casbin 的核心概念是**模型 (Model)** 和**策略 (Policy)**。

虽然 Casbin 的官方文档中并没有固定的 SQL 数据库表结构定义，但它通过**适配器 (Adapter)** 来连接各种存储后端（如文件、数据库等）来存储其**策略规则 (Policy Rules)**。

对于一个使用数据库存储策略的 Casbin 应用来说，其策略表通常会采用一个**统一的、通用的结构**来存储不同访问控制模型下的所有规则。

-----

## 策略表结构（通用适配器）

大多数 Casbin 数据库适配器（例如 `xorm-adapter` 或 `gorm-adapter`）使用的通用表结构，可以灵活地适应 Casbin 支持的各种模型（如 RBAC、ACL）。

这个表通常命名为 `casbin_rule` 或类似的名称，包含以下核心字段：

| 字段名 | 数据类型 | 说明 |
| :--- | :--- | :--- |
| `id` | `INT/BIGINT` | **主键**，自增 ID。 |
| `ptype` | `VARCHAR` | **策略类型** (Policy Type)。通常是模型中的配置项，如：<br> - `p`: 表示**策略规则**（Policy Rule），例如 ACL 规则。<br> - `g`: 表示**角色/用户关系**（Grouping Rule），例如 RBAC 中的用户与角色的映射。 |
| `v0` | `VARCHAR` | **字段 0**。通常是 **主体** (Subject) 或 **用户 ID/名称**。 |
| `v1` | `VARCHAR` | **字段 1**。通常是 **资源** (Object) 或 **角色 ID/名称**。 |
| `v2` | `VARCHAR` | **字段 2**。通常是 **操作** (Action) 或 **权限/资源**。 |
| `v3` | `VARCHAR` | **字段 3**。用于存储额外的属性，例如权限的**效果** (Effect)（`allow` 或 `deny`）或命名空间。 |
| `v4` | `VARCHAR` | **字段 4**。用于更复杂的模型或多租户场景。 |
| `v5` | `VARCHAR` | **字段 5**。用于最复杂的模型。 |

-----

### 结构解释：

1.  **`ptype` (策略类型):**

      * 这个字段是**最关键**的，它决定了后续 `v0-v5` 字段的含义。
      * 例如，如果 `ptype` 是 `p`，则表示这是一条访问策略规则。
      * 如果 `ptype` 是 `g`，则表示这是一条用户/角色分组规则（通常用于 RBAC）。

2.  **`v0` 到 `v5` (泛化字段):**

      * Casbin 的设计哲学是**模型与存储分离**。它不关心字段叫 `user`、`role`、`resource` 还是 `action`。它只关心有多少个字段，并将其泛化为 `v0, v1, v2...`。
      * **字段的实际含义由你定义的 Casbin `model.conf` 文件决定**。

### 示例数据 (基于常见的 RBAC/ACL 模型)

| id | ptype | v0 | v1 | v2 | v3 | v4 | v5 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | **p** | admin | data1 | read | allow | | |
| 2 | **p** | user | data2 | write | allow | | |
| 3 | **g** | alice | admin | | | | |
| 4 | **g** | bob | user | | | | |
| 5 | **g** | editor | admin | tenant1 | | | |

  * **行 1 & 2 (`ptype = p`):** 定义了角色的**权限**。
      * `v0` (主体/角色): `admin` 可以 `v1` (资源): `data1` 进行 `v2` (操作): `read`。
  * **行 3 & 4 (`ptype = g`):** 定义了用户与角色的**关系**。
      * `v0` (用户): `alice` 是 `v1` (角色): `admin` 的成员。
  * **行 5 (`ptype = g`):** 如果启用了多租户，`v2` 甚至可以用来指定**租户**。

-----

## 总结

Casbin 的表结构设计理念是：**用一个通用的表结构来存储所有访问控制模型下的所有规则**，而规则的具体含义则由其**模型文件** (`model.conf`) 来解释。

如果您想了解更多关于 `model.conf` 如何定义这些字段的含义，我可以为您介绍 Casbin 的**核心工作原理**。




Casbin 的 `model.conf` 文件是其**核心配置文件**，它定义了你正在使用的**访问控制模型**（例如 ACL、RBAC、ABAC）以及策略规则（Policy Rules）的具体结构。

这个文件通常是一个 INI 格式的文件，由多个 **Sections (配置节)** 组成，每个 Section 定义了访问控制模型的一个关键组成部分。

-----

## Casbin `model.conf` 的标准配置节

一个标准的 Casbin 模型文件通常包含以下六个配置节（Sections）：

| Section | 对应字母 | 描述 |
| :--- | :--- | :--- |
| `[request_definition]` | `r` | **请求定义**：定义输入请求的结构（谁请求做什么）。 |
| `[policy_definition]` | `p` | **策略定义**：定义策略规则的结构（策略表中各字段的含义）。 |
| `[role_definition]` | `g` | **角色定义**：定义角色或分组关系的结构（通常用于 RBAC）。 |
| `[policy_effect]` | `e` | **策略效果**：定义当多个策略匹配时的最终决策逻辑（允许/拒绝）。 |
| `[matchers]` | `m` | **匹配器**：定义访问请求与策略规则的匹配逻辑。 |
| `[policy_storage]` | `s` | **策略存储**：可选，定义策略存储方式的配置。 |

-----

## 核心配置节详解及示例

### 1\. 请求定义 `[request_definition]` (r)

定义一个访问请求包含哪些元素。标准的请求通常包括：**主体** (Subject)、**客体** (Object) 和**操作** (Action)。

```ini
[request_definition]
r = sub, obj, act
```

  * **r**: `r` 是 request 的缩写。
  * **sub**: 请求主体（例如：用户、客户端）。
  * **obj**: 请求客体（例如：资源路径 `/data/1`）。
  * **act**: 请求操作（例如：`read`, `write`, `GET`, `POST`）。

### 2\. 策略定义 `[policy_definition]` (p)

定义策略规则的结构，对应于数据库策略表中的 `v0, v1, v2...` 字段。它必须和 `[request_definition]` 的字段数量相匹配，并加上一个 `eft`（效果）字段。

```ini
[policy_definition]
p = sub, obj, act, eft
```

  * **p**: `p` 是 policy 的缩写。
  * **sub, obj, act**: 对应策略规则中的主体、客体和操作。
  * **eft**: 策略效果（Effect），如 `allow` 或 `deny`。在策略表中，`eft` 通常对应于 `v3` 字段。

### 3\. 角色定义 `[role_definition]` (g)

定义用户、角色或资源之间的分组（Grouping）关系。这是实现 RBAC (基于角色的访问控制) 的关键。

```ini
[role_definition]
g = _, _
```

  * **g**: `g` 是 grouping 的缩写。
  * **g = \_, \_**: 表示分组关系是 **A 属于 B**。例如：`g` 策略规则 `g, alice, admin` 表示 `alice` 属于 `admin` 角色。
  * **多层分组**: 可以定义多个分组，例如 `g2 = _, _` 用于定义资源的分组。

### 4\. 匹配器 `[matchers]` (m)

定义如何将**请求** (`r`) 与**策略** (`p`) 进行匹配，从而得出授权结果。它是模型中最核心的逻辑。

```ini
[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
```

  * 这是一个最简单的 **ACL (访问控制列表)** 匹配器：只有当请求的主体、客体和操作**全部精确匹配**策略规则时，才算匹配成功。

**RBAC 匹配器示例 (结合 `g`):**

```ini
[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

  * `g(r.sub, p.sub)`: 检查请求的主体 `r.sub` 是否属于策略的主体 `p.sub` **所代表的角色**。这是 RBAC 实现的基础。

### 5\. 策略效果 `[policy_effect]` (e)

定义当一个请求匹配到**多条**策略规则时，最终的授权效果是什么。

```ini
[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))
```

  * **`e`**: effect 的缩写。
  * 这是最常见的 **"优先拒绝"** (Deny-Override) 逻辑：
      * **只要有一个 `allow` 策略匹配就允许**（`some(where (p.eft == allow))`），
      * **除非有一个 `deny` 策略匹配**（`!some(where (p.eft == deny))`）。

-----

## 完整示例：经典 RBAC 模型

如果您想实现一个基于角色的访问控制模型（RBAC），您的 `model.conf` 可能会像这样：

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act, eft

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```



这个配置文件告诉 Casbin：

1.  请求结构是 (用户, 资源, 操作)。
2.  策略结构是 (角色, 资源, 操作, 效果)。
3.  存在用户到角色的分组关系 (`g` 规则)。
4.  匹配逻辑是：检查请求的用户是否属于策略定义的角色 (`g(r.sub, p.sub)`)，并且资源和操作匹配。
5.  最终授权结果采用优先拒绝的逻辑。

> m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act

我理解 g(r.sub, p.sub) 就是从ptype=g的记录中找出r.sub对应的角色。
然后查询ptype=p的记录中是否有匹配 `r.obj == p.obj && r.act == p.act` 的记录。
- 有：根据p.eft判断是否允许。
- 无：拒绝。

`ptype=g`记录是在初始化时被加载到内存中的，因为这部分数量通常是比较少的。

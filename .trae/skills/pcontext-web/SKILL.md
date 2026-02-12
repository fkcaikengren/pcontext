---
name: packages/web 子项目开发规范
description: pcontext项目的 packages/web 子项目的项目结构规范、代码规范和运行等操作规范。修改该子项目需要遵循这些规范。
---

# packages/web 子项目开发规范

## chat-web项目结构
`packages/web/app`目录下是chat-web项目的源代码，主要包括以下几个部分：
```
app/
├── components/
│   ├── ui/           # Shadcn 组件目录
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── ...           # 其他自定义组件
├── lib/
│   └── utils.ts      # cn() 工具函数
├── utils/                  # Function Tools
├── routes/
│   └── home.tsx            # Route component for the home page
├── app.css                 # Global application styles
├── root.tsx                # Root layout component (HTML, Meta, Links, Scripts)
└── routes.ts               # Route configuration file
```

## 项目运行和操作

### 运行项目
该子项目 作为monorepo的子项目，主要基于 Vite + Bun.js + pnpm 进行项目开发和管理，

### npm包安装和组件安装

安装npm包，优先全局安装，避免在子项目中安装。
```bash
# 安装项目依赖
bun add [npm包]
```

Shadcn安装UI组件
```bash
# 初始化配置
bunx --bun shadcn@latest init
# 安装单个组件
bunx --bun shadcn@latest add [组件]
```



## chat-web技术栈和规范

### 技术栈
主要技术栈： React19 + React Router v7 + Shadcn UI + TailwindCSS  v4 + Tanstack 
其他技术： 
- 查询数据和修改数据的请求优先使用 `@tanstack/react-query`
- 表单和表格相关功能优先使用 `@tanstack/react-form`和`@tanstack/react-table`
- `zod`验证表单数据；
- 使用vercel提供的`ai` v5库处理聊天功能；


### Tailwind CSS总体规范

1. 尽量避免写自定义样式，使用 Tailwind CSS 提供的类名。
2. 不推荐 @apply 自定义的类名，使用Class Variance Authority。
3. 在开发之前，最好确定设计规范。然后通过 tailwind.config.js 修改默认值或者新增类名。尽量避免使用 Arbitrary values，比如这样`p-[0.5rem]`。  
4. 使用 `cn()` 合并类名，处理条件样式

仅使用 Tailwind 的**预定义核心类**，避免自定义配置：
```tsx
// ✅ 正确
<Button className="bg-blue-500 hover:bg-blue-600 px-4 py-2">

// ❌ 错误 - 自定义类名
<Button className="bg-primary-custom">
```

**cn() 工具函数**
使用 `cn()` 合并类名，处理条件样式：
```tsx
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className
)} />
```


#### 变体系统

使用 `class-variance-authority` 创建变体：

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        outline: "border border-input bg-transparent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      }
    }
  }
)
```

#### 扩展组件

直接修改 `components/ui` 中的文件，或创建包装组件：

```tsx
// components/custom-button.tsx
import { Button } from "@/components/ui/button"

export function CustomButton({ children, ...props }) {
  return (
    <Button className="custom-styles" {...props}>
      {children}
    </Button>
  )
}
```

#### 响应式设计

使用 Tailwind 响应式前缀：

```tsx
<Card className="w-full md:w-1/2 lg:w-1/3">
```

#### 主题定制

在 `packages/web/app/app.css` 中使用 CSS 变量：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```
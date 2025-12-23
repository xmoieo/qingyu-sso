# 开发指南

本文档为 SSO 统一身份认证平台的开发者提供详细的开发指南和最佳实践。

## 开发环境设置

### 前置要求

- Node.js 18.0.0 或更高版本
- npm、yarn 或 bun 包管理器
- Git
- VS Code（推荐）或其他代码编辑器

### 克隆项目

```bash
git clone https://github.com/your-username/sso.git
cd sso
```

### 安装依赖

推荐使用 bun（速度更快）：

```bash
bun install
```

或者使用 npm：

```bash
npm install
```

### 环境配置

创建 `.env.local` 文件：

```env
# 数据库配置
DATABASE_URL="file:./data/sso.db"

# JWT密钥
JWT_SECRET="your-secret-key"

# 应用URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 初始化数据库

```bash
# 生成Prisma客户端
bun run prisma:generate:sqlite

# 推送数据库结构
bun run prisma:dbpush:sqlite

# （可选）查看数据库
bun run prisma:studio:sqlite
```

### 启动开发服务器

```bash
bun run dev
```

访问 http://localhost:3000 查看应用。

## 项目结构详解

### App Router 结构

Next.js 13+ 引入了 App Router，基于文件系统的路由：

```
app/
├── (auth)/            # 路由组，不影响URL
│   ├── login/         # /login
│   │   └── page.tsx   # 登录页面
│   └── register/      # /register
│       └── page.tsx   # 注册页面
├── dashboard/         # /dashboard
│   └── page.tsx       # 仪表盘页面
├── oauth/             # /oauth
│   └── authorize/     # /oauth/authorize
│       └── page.tsx   # 授权页面
├── api/               # API路由
│   ├── auth/          # /api/auth/*
│   │   ├── login/     # /api/auth/login
│   │   ├── register/  # /api/auth/register
│   │   └── logout/    # /api/auth/logout
│   └── oauth/         # /api/oauth/*
│       ├── authorize/ # /api/oauth/authorize
│       ├── token/     # /api/oauth/token
│       └── userinfo/  # /api/oauth/userinfo
├── globals.css        # 全局样式
├── layout.tsx         # 根布局
└── page.tsx           # 首页 (/)
```

### 组件组织

```
components/
├── ui/               # 基础UI组件
│   ├── Button.tsx
│   ├── Input.tsx
│   └── ...
├── forms/            # 表单组件
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
├── layout/           # 布局组件
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Footer.tsx
└── auth/             # 认证相关组件
    ├── AuthGuard.tsx
    └── AuthProvider.tsx
```

### 库文件组织

```
lib/
├── auth.ts           # 认证逻辑
├── db.ts             # 数据库连接
├── oauth.ts          # OAuth服务
├── utils.ts          # 通用工具函数
├── validations.ts    # 数据验证
└── constants.ts      # 常量定义
```

## 开发规范

### 代码风格

项目使用 ESLint 和 TypeScript 进行代码规范检查：

```bash
# 检查代码
bun run lint

# 自动修复
bun run lint --fix
```

#### 命名规范

- **文件名**: 使用 PascalCase（组件）或 camelCase（工具）
- **组件名**: 使用 PascalCase
- **函数/变量**: 使用 camelCase
- **常量**: 使用 UPPER_SNAKE_CASE
- **接口/类型**: 使用 PascalCase

#### 类型定义

```typescript
// 使用 interface 定义对象结构
interface User {
  id: string;
  username: string;
  email: string;
}

// 使用 type 定义联合类型、交叉类型等
type UserRole = "admin" | "developer" | "user";
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

### 数据库操作

使用 Prisma ORM 进行数据库操作：

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 查询
const users = await prisma.user.findMany({
  where: { role: "admin" },
  include: { applications: true },
});

// 创建
const newUser = await prisma.user.create({
  data: {
    username: "johndoe",
    email: "john@example.com",
    password: hashedPassword,
  },
});

// 更新
const updatedUser = await prisma.user.update({
  where: { id: userId },
  data: { nickname: "John Doe" },
});

// 删除
await prisma.user.delete({
  where: { id: userId },
});
```

### API 路由

Next.js 13+ 使用 Route Handlers 定义 API：

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 验证数据
    // 创建用户
    // 返回响应
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
```

### 表单处理

使用 Server Actions 处理表单：

```typescript
// app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bcrypt } from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function login(prevState: any, formData: FormData) {
  const validatedFields = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid fields",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validatedFields.data;

  // 验证用户
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: "Invalid username or password" };
  }

  // 创建会话
  // ...

  redirect("/dashboard");
}
```

## 测试

### 单元测试

项目使用 Jest 和 React Testing Library：

```bash
# 运行测试
bun test

# 监视模式
bun test:watch

# 覆盖率报告
bun test:coverage
```

### 测试示例

```typescript
// components/__tests__/Button.test.tsx
import { render, screen } from "@testing-library/react";
import { Button } from "../ui/Button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    screen.getByText("Click me").click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 部署

### 构建应用

```bash
# 构建生产版本
bun run build

# 启动生产服务器
bun run start
```

### Docker 部署

创建 Dockerfile：

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN bun install --frozen-lockfile --production

FROM base AS builder
COPY . .
RUN bun run build

FROM base AS runner
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 环境变量

生产环境需要配置以下环境变量：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/sso"

# 安全
JWT_SECRET="your-super-secret-jwt-key"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"

# 应用
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## 贡献指南

### 提交代码

1. Fork 项目
2. 创建功能分支：

```bash
git checkout -b feature/amazing-feature
```

3. 提交更改：

```bash
git commit -m 'Add some amazing feature'
```

4. 推送到分支：

```bash
git push origin feature/amazing-feature
```

5. 创建 Pull Request

### 提交信息规范

使用 Conventional Commits 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：

```
feat(auth): add OAuth 2.0 support

Implement authorization code flow with PKCE support
for enhanced security in SPA and mobile applications.

Closes #123
```

### 代码审查

所有 PR 必须通过代码审查：

1. 代码风格检查通过
2. 所有测试通过
3. 至少一个维护者批准
4. 解决所有审查意见

## 常见问题

### 如何调试？

1. 使用 console.log 调试
2. 使用 VS Code 调试器
3. 使用浏览器开发者工具

### 如何添加新的 API 端点？

1. 在 `app/api/` 下创建路由文件
2. 实现请求处理逻辑
3. 添加适当的错误处理
4. 编写测试

### 如何添加新的页面？

1. 在 `app/` 下创建目录和 `page.tsx`
2. 实现页面组件
3. 如需布局，添加 `layout.tsx`

### 如何处理认证？

1. 使用中间件保护路由
2. 检查用户会话/令牌
3. 重定向未认证用户

### 如何管理状态？

1. 组件状态：使用 useState/useReducer
2. 全局状态：使用 Context API 或状态管理库
3. 服务器状态：使用 Server Components

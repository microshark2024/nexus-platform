# 🌌 Nexus | 新一代 AI 协作项目管理平台

Nexus 是一个专业级的 AI 驱动项目管理与团队协作平台。系统采用前后端分离架构，前端基于 Next.js 16 (App Router) 与 TypeScript 构建，后端采用 Python FastAPI 提供 AI 智能分析服务，数据库与用户认证集成本地或云端的 Supabase。

---

## 🚀 核心特性

- **动态看板 (Kanban)**：直观管理任务生命周期，分为“待办 (Todo)”、“进行中 (Doing)”、“已完成 (Done)”三列，支持状态一键迁移与即时刷新。
- **Supabase 实时同步 (Realtime)**：团队成员之间的任务看板变动秒级实时同步，体验零延迟协作。
- **防循环安全行级安全策略 (RLS)**：使用 `SECURITY DEFINER` 编写 SQL 辅助函数查询成员资格，完美打破 Postgres 默认的 RLS 循环递归问题。
- **健壮的 CORS 跨域配置**：Pydantic v2 Settings 配置解析器支持 `.env` 中逗号分隔（如 `a,b`）和 JSON 数组（如 `["a","b"]`）两种跨域源格式，且避开 Pydantic 默认解析报错。
- **AI 智能项目洞察 (AI Insights)**：一键对当前项目及任务快照进行全方位诊断，生成结构化的 Markdown 项目分析报告。
- **演示模式平滑降级 (Demo Mode)**：在 API 密钥未配置或为占位符时，自动切换为本地高精度 Mock LLM 引擎，输出精美的 Demo 洞察报告，确保系统演示可用。

---

## 📂 项目结构

```text
nexus/
├── frontend/          # Next.js 16 Web 前端项目 (TypeScript, Tailwind)
├── backend/           # Python FastAPI 后端服务 (AI 智能洞察)
├── supabase/          # PostgreSQL 数据库初始化与 RLS 安全策略迁移脚本
├── README.md          # 根目录项目说明文档
└── .gitignore         # Root Git 忽略规则配置
```

---

## 🛠️ 快速开始

### 1. 数据库配置
复制 `supabase/migrations/001_init.sql` 中的 SQL 脚本，并在你的 Supabase 项目 **SQL Editor** 中运行。这会自动创建 profiles 触发器、workspaces（工作空间）、projects（项目）、tasks（任务）表以及防循环的 RLS 策略。

### 2. 后端 FastAPI 服务启动
1. 进入 backend 目录，复制环境配置模板：
   ```bash
   cd backend
   copy .env.example .env
   ```
2. 编辑 `.env` 配置文件（如配置 `SUPABASE_URL`、`SUPABASE_SECRET_KEY`、`LLM_API_KEY` 等）。
3. 安装依赖并启动服务：
   ```bash
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### 3. 前端 Next.js 16 项目启动
1. 进入 frontend 目录，复制环境配置模板：
   ```bash
   cd frontend
   copy .env.example .env.local
   ```
2. 配置参数（如 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、以及指向后端的 `NEXT_PUBLIC_BACKEND_URL`）。
3. 运行前端开发服务器：
   ```bash
   npm run dev
   ```
4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## 🛡️ 开源协议
本项目基于 MIT 协议开源。详情请参阅 `LICENSE`。

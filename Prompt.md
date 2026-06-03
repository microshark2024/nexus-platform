请帮我从零构建一个名为 "Nexus" 的专业级 AI 协作项目管理平台。该系统采用前后端分离架构，前端使用 Next.js 16 + TypeScript，后端使用 Python FastAPI，数据库与认证直接集成本地或云端 Supabase。项目所有的前端界面设计、提示信息、全局通知、弹窗表单以及后端的 AI 智能分析报告都必须使用中文。

以下是该项目的具体规格和架构要求：

---

### 1. 技术栈要求
- **前端**：Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide React (图标), Sonner (全局通知)。
- **后端**：FastAPI (Python 3.10+), Pydantic v2 (配置与数据验证), httpx (异步调用 LLM), uvicorn (服务启动)。
- **数据库/认证/实时同步**：Supabase (PostgreSQL + Auth + Realtime)。

---

### 2. 数据库设计 (Supabase Schema & Migrations)
在 `supabase/migrations/001_init.sql` 中提供以下表结构：
1. **profiles**：继承自 `auth.users`，字段包括 `id` (UUID), `full_name`, `avatar_url`, `job_title`, `created_at`, `updated_at`。包含触发器：当 `auth.users` 新增用户时，自动在 `profiles` 中插入对应记录。
2. **workspaces**：工作空间。字段：`id` (UUID), `name`, `slug` (唯一), `owner_id` (关联 auth.users), `created_at`, `updated_at`。
3. **workspace_members**：工作空间成员。字段：`workspace_id`, `user_id`, `role` ('owner', 'admin', 'member')，联合主键。
4. **projects**：项目。字段：`id` (UUID), `workspace_id`, `name`, `description`, `status` ('active', 'archived', 'completed'), `created_by` (关联 auth.users), `created_at`, `updated_at`。
5. **tasks**：任务。字段：`id` (UUID), `project_id`, `title`, `description`, `status` ('todo', 'doing', 'done'), `priority` ('low', 'medium', 'high'), `due_date` (DATE), `assignee_id` (关联 auth.users), `created_by`, `created_at`, `updated_at`。

#### RLS（行级安全）策略安全防循环：
- 启用所有表的 RLS。
- 编写 `SECURITY DEFINER` 的 SQL 辅助函数（如 `is_workspace_member`, `is_workspace_owner`, `can_access_project`）来查询成员资格以打破 Postgres 的 RLS 循环递归。
- 确保工作空间的 Owner 在 `workspace_members` 还没有记录时也可以进行管理（即允许添加首个成员自己），并允许 Workspace 成员或 Owner 创建项目和任务。

---

### 3. 前端功能与页面设计 (Next.js)
实现具有现代极简高级感且界面语言全中文化的以下页面：
1. **Landing 首页 (/)**：现代风格的产品介绍、功能特性展示、开始使用入口。
2. **登录与注册 (/login & /signup)**：
   - 注册时自动收集姓名，调用 Supabase 注册，并引导至 Dashboard。
   - 注册成功后，当用户首次访问项目或仪表盘时，如没有工作空间，应在前端或通过内置 RPC 自动为其创建一个“默认工作空间”并添加自己为 `owner` 成员。
3. **仪表盘 (/dashboard)**：
   - 展示统计卡片：活跃项目数、进行中任务数、总任务数。
   - 展示最近参与的项目列表。
   - 列出我加入的全部工作空间。
   - 提供“新建项目”的弹窗或页面（自动关联当前活跃工作空间）。
4. **项目看板页面 (/projects/[id])**：
   - 展示项目名称与描述。
   - **Kanban 看板**：分三列（待办、进行中、已完成）。
   - 提供快速状态迁移按钮，点击即更新状态，并且更新后立刻调用前端 `loadData()` 刷新界面。
   - **实时同步 (Realtime)**：使用 `@supabase/ssr` 订阅 `tasks` 表的变动。由于 `DELETE` 事件在 RLS 开启下可能不携带 `project_id` 列，请在客户端取消 `filter` 过滤，而在内存中比对 `tasksRef.current` 任务的 ID 来触发界面更新。
   - **AI 智能洞察按钮**：点击调用 FastAPI 后端 `/ai/insights` 接口。

---

### 4. 后端 Python FastAPI 设计
提供结构清晰的代码：
1. **Settings (app/core/config.py)**：
   - 包含 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`。
   - 包含 CORS 配置 `ALLOWED_ORIGINS: Union[List[str], str]`，在 Pydantic 中使用 `Annotated[Union[List[str], str], NoDecode]` 并配有 `@field_validator`，确保能完美兼容 `.env` 中逗号分隔（如 `a,b`）和 JSON 数组（如 `["a","b"]`）两种写法，同时避免 Pydantic Settings 对非 JSON 的逗号分隔字符串自动进行 json 解析报错。
2. **LLM 客户端与 Demo 降级 (app/services/llm.py)**：
   - 默认支持调用 OpenAI 兼容端点（如 OpenAI, xAI Grok, Together, Ollama 本地模型）。
   - 编写 `is_demo_mode` 属性：如果检测到 API 密钥为空，或者是占位符（如 `sk-...`、`xai-...` 等），则自动标记为演示模式。
   - 在演示模式下，直接返回写好的中文精美 Demo 洞察报告（包含 markdown 格式的项目摘要、任务优先级排序、风险提示等），而不是报错。
3. **AI 路由 (app/api/routes/ai.py)**：
   - 暴露 `POST /ai/insights` 接口，接收前端提交的当前项目与任务的快照（Snapshot），构建 System Prompt 和 User Prompt，调用大模型使用中文分析。
   - 返回统一的 `InsightResponse`，包含生成的 Content、模型名称、以及是否为 Demo 模式的标志。

---

### 5. 配置文件样例
1. **根目录下 `.env.example`**
2. **frontend 下 `.env.example`**（定义 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`）
3. **backend 下 `.env.example`**（定义 `SUPABASE_URL` 和 `SUPABASE_SECRET_KEY` 以及 `LLM_API_KEY`）

请按照生产环境标准编写该项目，确保类型安全（TypeScript 无 lint 错误），后端逻辑健壮，数据库设计具备防递归和实时推送的高可用特征。

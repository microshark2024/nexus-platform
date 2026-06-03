# 🌌 Nexus | Next-Gen AI Collaborative Project Management Platform

Nexus is a professional-grade, AI-driven project management and collaboration system. It adopts a decoupled front-end and back-end architecture with a Next.js 16 frontend, a Python FastAPI backend service, and database/authentication directly powered by Supabase.

---

## 🚀 Key Features

- **Dynamic Kanban Board**: Organize tasks through visual columns (`Todo`, `In Progress`, `Done`) with instant status transitions.
- **Supabase Real-Time Sync**: Fully synchronized task states across multiple browsers and teammates, powered by Postgres replication.
- **Robust RLS Security Definer Policies**: Custom SQL helper functions to query workspace memberships under Row Level Security, eliminating Postgres policy recursion loops.
- **CORS Allowed Origins Robustness**: Pydantic v2 Settings config parsing supports both comma-separated lists and JSON arrays seamlessly.
- **AI Smart Insights Engine**: One-click project diagnostics summarizing health metrics, prioritizations, and critical bottlenecks.
- **Demonstration Fallback (Demo Mode)**: Seamless fallback to a detailed, local Markdown analytical report if API keys are absent or contain placeholders.

---

## 📂 Project Structure

```text
nexus/
├── frontend/          # Next.js 16 web application (App Router, TS, Tailwind)
├── backend/           # Python FastAPI backend (LLM insights service)
├── supabase/          # PostgreSQL migrations and RLS schema scripts
├── README.md          # Project root guide
└── .gitignore         # Root git ignore rules
```

---

## 🛠️ Quick Start Guide

### 1. Database Configuration
Copy the migrations script at `supabase/migrations/001_init.sql` and run it inside your Supabase project's **SQL Editor**. This sets up the profiles trigger, workspaces, projects, tasks, security helper functions, and RLS policies.

### 2. Backend FastAPI Startup
1. Move to the backend directory and copy the environment configuration:
   ```bash
   cd backend
   copy .env.example .env
   ```
2. Configure credentials in the `.env` file (e.g., `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `LLM_API_KEY`).
3. Install dependencies and launch the server:
   ```bash
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### 3. Frontend Next.js 16 Startup
1. Move to the frontend directory and copy the environment local configuration:
   ```bash
   cd frontend
   copy .env.example .env.local
   ```
2. Configure settings (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BACKEND_URL`).
3. Boot the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

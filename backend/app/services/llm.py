# backend/app/services/llm.py
import httpx
from typing import List, Dict, Any
from app.core.config import settings

class LLMService:
    @property
    def is_demo_mode(self) -> bool:
        api_key = settings.LLM_API_KEY.strip()
        # Returns True if the API Key is empty or matches placeholder formats
        if not api_key:
            return True
        if api_key.lower() in ["", "sk-...", "xai-...", "your_api_key_here", "sk-yourkeyhere"]:
            return True
        if api_key.startswith("sk-...") or api_key.startswith("xai-..."):
            return True
        return False

    async def get_insights(self, project_name: str, project_description: str, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        if self.is_demo_mode:
            return {
                "content": self._generate_demo_insights(project_name, project_description, tasks),
                "model": "Demo mode (Mock LLM Engine)",
                "is_demo": True
            }

        # Real LLM call setup
        system_prompt = (
            "You are a professional project management AI assistant. "
            "Analyze the project and tasks snapshot provided by the user, and generate professional insights. "
            "Structure your analysis in clean, professional Markdown with the following sections:\n"
            "1. **Project Health & Summary**: General state and progress.\n"
            "2. **Task Priority Recommendations**: Highlight critical and high-priority tasks.\n"
            "3. **Risk Analysis**: Identify potential blockers, overdue tasks, or bottleneck roles.\n"
            "4. **Actionable Suggestions**: Concrete steps to accelerate project completion."
        )

        user_prompt = (
            f"Project Name: {project_name}\n"
            f"Description: {project_description or 'No description'}\n\n"
            f"Tasks Snapshot:\n"
        )
        for i, t in enumerate(tasks, 1):
            user_prompt += (
                f"- Task {i}: {t.get('title')} | Status: {t.get('status')} | "
                f"Priority: {t.get('priority')} | Due Date: {t.get('due_date') or 'N/A'} | "
                f"Assignee ID: {t.get('assignee_id') or 'Unassigned'}\n"
            )

        headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.LLM_API_BASE}/chat/completions",
                    json=payload,
                    headers=headers
                )
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    return {
                        "content": content,
                        "model": settings.LLM_MODEL,
                        "is_demo": False
                    }
                else:
                    return {
                        "content": (
                            f"### ⚠️ LLM API Error ({response.status_code})\n\n"
                            f"The LLM endpoint returned an error status. Defaulting to Demo Mode report for display.\n\n"
                            f"---\n\n"
                            f"{self._generate_demo_insights(project_name, project_description, tasks)}"
                        ),
                        "model": f"{settings.LLM_MODEL} (Error Fallback) -> Demo",
                        "is_demo": True
                    }
        except Exception as e:
            return {
                "content": (
                    f"### ⚠️ LLM Connection Failed\n\n"
                    f"Failed to connect to the configured LLM API ({str(e)}). Defaulting to Demo Mode report.\n\n"
                    f"---\n\n"
                    f"{self._generate_demo_insights(project_name, project_description, tasks)}"
                ),
                "model": f"{settings.LLM_MODEL} (Connection Fallback) -> Demo",
                "is_demo": True
            }

    def _generate_demo_insights(self, project_name: str, project_description: str, tasks: List[Dict[str, Any]]) -> str:
        total_tasks = len(tasks)
        todo_count = sum(1 for t in tasks if t.get("status") == "todo")
        doing_count = sum(1 for t in tasks if t.get("status") == "doing")
        done_count = sum(1 for t in tasks if t.get("status") == "done")
        high_priority = sum(1 for t in tasks if t.get("priority") == "high" and t.get("status") != "done")

        desc = project_description or "No description provided for this project."

        markdown_content = f"""# 🌌 AI Smart Insights: {project_name}

> **[Demo Mode Active]** Here is a professional analytical snapshot generated by the Nexus AI advisor.

---

### 📈 1. Project Health & Summary
- **Progress Ratio**: {done_count}/{total_tasks} tasks completed ({(done_count / total_tasks * 100) if total_tasks > 0 else 0:.1f}%).
- **Active Workload**: **{doing_count}** tasks currently in progress, **{todo_count}** tasks in backlog.
- **Project Goal**: {desc}

### ⚡ 2. Task Priority Recommendations
Based on execution patterns, the following active tasks require immediate attention:
"""
        # Highlight high-priority tasks
        active_high_tasks = [t for t in tasks if t.get("priority") == "high" and t.get("status") != "done"]
        if active_high_tasks:
            for t in active_high_tasks:
                markdown_content += f"- 🔴 **[High Priority]** `{t.get('title')}` (Status: {t.get('status')}) - Please verify resources are allocated to meet the schedule.\n"
        else:
            markdown_content += "- 🟢 No high priority active tasks detected. Excellent work keeping the backlog balanced.\n"

        # Highlight currently active tasks
        active_doing = [t for t in tasks if t.get("status") == "doing"]
        if active_doing:
            markdown_content += "\n**Currently Active Tasks (In Progress):**\n"
            for t in active_doing:
                assignee = t.get('assignee_id') or 'Unassigned'
                markdown_content += f"- 🔄 `{t.get('title')}` (Assignee: `{assignee}`)\n"

        markdown_content += f"""
### 🔍 3. Risk Analysis & Bottlenecks
- **Priority Density**: There are **{high_priority}** high priority tasks. Ensure task assignments are distributed to avoid developer burnout.
- **Unassigned Backlog**: {sum(1 for t in tasks if not t.get('assignee_id') and t.get('status') != 'done')} tasks are unassigned. Unassigned items run a high risk of slipping their targets.
- **Deadlines Check**: Ensure dates are configured for key delivery items.

### 💡 4. Actionable Suggestions
1. 🎯 **Resource Balancing**: Assign any unassigned tasks in the `todo` column to prevent launch delays.
2. 🔄 **Accelerate Kanban flow**: Transition tasks in the `doing` column to `done` before picking up new work items.
3. 💬 **Stand-ups**: Conduct a quick sync on high-priority items to resolve blockers.
"""
        return markdown_content

llm_service = LLMService()

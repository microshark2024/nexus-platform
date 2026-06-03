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
                "model": "演示模式 (本地高精度 Mock 引擎)",
                "is_demo": True
            }

        # Real LLM call setup
        system_prompt = (
            "你是一个专业级的项目管理 AI 助手。\n"
            "分析用户提供的项目和任务快照，并生成专业深入的诊断与洞察报告。\n"
            "请使用清晰优雅的中文 Markdown 格式输出，报告结构必须包含以下部分：\n"
            "1. **项目健康度评估与摘要**：总体健康状态与项目进度百分比。\n"
            "2. **关键优先任务推荐**：高优先级任务、紧急待办任务的排序和资源建议。\n"
            "3. **潜在风险与瓶颈分析**：包括延期风险、人员负荷失衡、未指派任务或角色瓶颈。\n"
            "4. **具体行动建议**：给出加速项目完成、减少交付风险的落地执行步骤。"
        )

        user_prompt = (
            f"项目名称: {project_name}\n"
            f"项目描述: {project_description or '未提供描述'}\n\n"
            f"任务快照数据:\n"
        )
        for i, t in enumerate(tasks, 1):
            user_prompt += (
                f"- 任务 {i}: {t.get('title')} | 状态: {t.get('status')} | "
                f"优先级: {t.get('priority')} | 截止日期: {t.get('due_date') or '未设置'} | "
                f"指派成员 ID: {t.get('assignee_id') or '未分配'}\n"
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
                            f"### ⚠️ LLM 接口调用异常 ({response.status_code})\n\n"
                            f"大模型端点返回了错误状态码。系统已自动为您降级并切换至演示模式，提供本地快照报告。\n\n"
                            f"---\n\n"
                            f"{self._generate_demo_insights(project_name, project_description, tasks)}"
                        ),
                        "model": f"{settings.LLM_MODEL} (调用异常) -> 演示降级",
                        "is_demo": True
                    }
        except Exception as e:
            return {
                "content": (
                    f"### ⚠️ LLM 接口网络连接失败\n\n"
                    f"未能成功连接到配置的大模型 API 服务 ({str(e)})。系统已自动为您切换至演示模式报告。\n\n"
                    f"---\n\n"
                    f"{self._generate_demo_insights(project_name, project_description, tasks)}"
                ),
                "model": f"{settings.LLM_MODEL} (连接失败) -> 演示降级",
                "is_demo": True
            }

    def _generate_demo_insights(self, project_name: str, project_description: str, tasks: List[Dict[str, Any]]) -> str:
        total_tasks = len(tasks)
        todo_count = sum(1 for t in tasks if t.get("status") == "todo")
        doing_count = sum(1 for t in tasks if t.get("status") == "doing")
        done_count = sum(1 for t in tasks if t.get("status") == "done")
        high_priority = sum(1 for t in tasks if t.get("priority") == "high" and t.get("status") != "done")

        desc = project_description or "未为此项目提供详细描述。"
        progress_percentage = (done_count / total_tasks * 100) if total_tasks > 0 else 0

        markdown_content = f"""# 🌌 AI 智能诊断洞察: {project_name}

> **[演示模式激活中]** 以下是由 Nexus AI 顾问基于您当前看板任务生成的专业级项目运营诊断。

---

### 📈 1. 项目健康度评估与摘要
- **项目进度**: {done_count}/{total_tasks} 个任务已完成 ({progress_percentage:.1f}%)。
- **当前负荷**: 共有 **{doing_count}** 个任务正在开发中，**{todo_count}** 个任务在待办队列中。
- **项目背景**: {desc}

### ⚡ 2. 关键优先任务推荐
分析当前看板状态，以下未完成的高优任务需要团队密切关注：
"""
        # Highlight high-priority tasks
        active_high_tasks = [t for t in tasks if t.get("priority") == "high" and t.get("status") != "done"]
        if active_high_tasks:
            for t in active_high_tasks:
                markdown_content += f"- 🔴 **[高优任务]** `{t.get('title')}` (当前状态: {t.get('status')}) - 请确保相关资源已指派，优先保障交付节点。\n"
        else:
            markdown_content += "- 🟢 目前没有未完成的高优先级任务。积压队列状态良好。\n"

        # Highlight currently active tasks
        active_doing = [t for t in tasks if t.get("status") == "doing"]
        if active_doing:
            markdown_content += "\n**当前正在全力推进的任务 (In Progress):**\n"
            for t in active_doing:
                assignee = t.get('assignee_id') or '未分配成员'
                markdown_content += f"- 🔄 `{t.get('title')}` (执行人: `{assignee}`)\n"

        markdown_content += f"""
### 🔍 3. 潜在风险与瓶颈分析
- **高能耗积压**: 当前有 **{high_priority}** 个高优任务尚未完成。请关注分配占比以防止团队过度疲劳。
- **未指派流失风险**: 积压队列中共有 {sum(1 for t in tasks if not t.get('assignee_id') and t.get('status') != 'done')} 个未指派人员的待办事项。未指定负责人的任务容易出现排期滞后。
- **排期健康度**: 建议为所有关键交付路径上的任务添加截止日期（Due Date）以保障里程碑节点。

### 💡 4. 具体行动建议
1. 🎯 **人员合理调配**：检查并指派 `Todo` 列中处于未指派状态的任务，防止工作遗漏。
2. 🔄 **聚焦在研交付**：优先推动当前 `Doing` 状态的任务至 `Done`，避免开启过多并行任务导致开发线过长。
3. 💬 **站会焦点对齐**：针对红色高优先级的未完成任务组织短会，快速对齐进度与瓶颈。
"""
        return markdown_content

llm_service = LLMService()

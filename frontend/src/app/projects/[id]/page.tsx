// frontend/src/app/projects/[id]/page.tsx
"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Sparkles, Plus, Trash2, 
  Loader2, User, Calendar, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string;
  workspace_id: string;
}

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  assignee_id: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [user, setUser] = useState<any>(null);

  // 内存 Ref 用于 Supabase Realtime 删除事件过滤
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // 看板弹窗状态
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // AI 智能分析报告状态
  const [showInsights, setShowInsights] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightReport, setInsightReport] = useState<any>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      // 1. 获取项目基本情况
      const { data: projData, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projError) throw projError;
      setProject(projData);

      // 2. 获取所属项目下的全部任务卡片
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // 3. 加载成员列表以便指派
      const { data: workspaceMembers, error: membersError } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", projData.workspace_id);

      if (!membersError && workspaceMembers) {
        const userIds = workspaceMembers.map((m: any) => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        setProfiles(profilesData || []);
      }
    } catch (err: any) {
      toast.error("获取项目看板详情失败。");
      console.error(err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  // 会话检查
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // 实时通道侦听配置
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel("project-kanban-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newTask = payload.new as Task;
            if (newTask.project_id === projectId) {
              setTasks((prev) => {
                if (prev.some((t) => t.id === newTask.id)) return prev;
                return [...prev, newTask];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new as Task;
            if (updatedTask.project_id === projectId) {
              setTasks((prev) =>
                prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
              );
            } else {
              setTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            // 采用内存比对，规避 Postgres RLS DELETE 不传递 project_id 的缺陷
            const existsInCurrent = tasksRef.current.some((t) => t.id === deletedId);
            if (existsInCurrent) {
              setTasks((prev) => prev.filter((t) => t.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // 卡片横向状态扭转迁移
  const handleTransition = async (taskId: string, currentStatus: string, direction: "next" | "prev") => {
    let nextStatus: "todo" | "doing" | "done" = "todo";
    if (direction === "next") {
      nextStatus = currentStatus === "todo" ? "doing" : "done";
    } else {
      nextStatus = currentStatus === "done" ? "doing" : "todo";
    }

    try {
      // 乐观更新 UI
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );

      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", taskId);

      if (error) throw error;
      
      await loadData();
    } catch (err: any) {
      toast.error("扭转卡片交付状态失败。");
      loadData();
    }
  };

  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    const confirm = window.confirm("您确认要彻底删除这个任务卡片吗？此操作无法撤销。");
    if (!confirm) return;

    try {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
      toast.success("任务卡片已彻底移除。");
    } catch (err: any) {
      toast.error("删除任务卡片异常。");
      loadData();
    }
  };

  // 新增任务
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;

    setCreatingTask(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          title: newTaskTitle,
          description: newTaskDesc,
          status: "todo",
          priority: newTaskPriority,
          assignee_id: newTaskAssignee || null,
          due_date: newTaskDueDate || null,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("工作事项已成功添加至待办列表。");
      setShowTaskModal(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("medium");
      setNewTaskAssignee("");
      setNewTaskDueDate("");
      
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "添加任务画布失败。");
    } finally {
      setCreatingTask(false);
    }
  };

  // 触发 AI 分析报告生成
  const triggerAIInsights = async () => {
    if (!project) return;
    setInsightsLoading(true);
    setShowInsights(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      const payload = {
        project_name: project.name,
        project_description: project.description,
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          assignee_id: t.assignee_id
        }))
      };

      const response = await fetch(`${backendUrl}/ai/insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`FastAPI 服务返回异常状态码 ${response.status}`);
      }

      const report = await response.json();
      setInsightReport(report);
    } catch (err: any) {
      toast.error("未能获取 AI 看板分析，请检查后端 FastAPI 进程是否正常监听。");
      setShowInsights(false);
      console.error(err);
    } finally {
      setInsightsLoading(false);
    }
  };

  // 渲染简易 Markdown 元素为 HTML
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return "";
    let html = markdown
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    html = html.replace(/^\s*>\s*(.*)$/gm, '<blockquote class="border-l-2 border-violet-500 pl-3.5 py-0.5 my-3 bg-violet-500/5 text-slate-300 italic font-light">$1</blockquote>');
    html = html.replace(/^\s*###\s+(.*)$/gm, '<h4 class="text-xs font-bold text-violet-400 mt-4 mb-2 uppercase tracking-wide flex items-center gap-1.5">⚡ $1</h4>');
    html = html.replace(/^\s*##\s+(.*)$/gm, '<h3 class="text-sm font-bold text-white border-b border-white/5 pb-1 mt-5 mb-3">$1</h3>');
    html = html.replace(/^\s*#\s+(.*)$/gm, '<h2 class="text-base font-extrabold text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text mt-6 mb-4">$1</h2>');
    html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li class="ml-4 list-disc text-slate-300 text-xs my-1 leading-relaxed">$1</li>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>');
    html = html.replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-fuchsia-400 font-mono text-[10px]">$1</code>');
    html = html.replace(/^\s*---\s*$/gm, '<hr class="border-white/5 my-4" />');
    html = html.replace(/\n\n/g, "</p><p class='text-xs text-slate-400 my-2 leading-relaxed'>");

    return <div dangerouslySetInnerHTML={{ __html: `<p class='text-xs text-slate-400 my-2 leading-relaxed'>${html}</p>` }} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <span className="text-sm font-light">正在拉取看板卡片信息...</span>
      </div>
    );
  }

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const doingTasks = tasks.filter((t) => t.status === "doing");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col font-sans relative">
      
      {/* 极光背景 */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[150px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* 顶部标题与控制 */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">{project?.name}</h2>
            <p className="text-[10px] text-slate-400 font-light">敏捷协作看板</p>
          </div>
        </div>

        {/* AI 项目分析报告与新建任务 */}
        <div className="flex items-center gap-3">
          <button
            onClick={triggerAIInsights}
            className="h-9 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-2 text-violet-300 hover:text-violet-200 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            AI 智能项目诊断
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/10 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        </div>
      </header>

      {/* 看板主面 */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        
        {/* 看板项目背景说明 */}
        <div className="p-4 rounded-xl glass-panel text-slate-300 flex flex-col gap-1.5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">项目背景画布</h3>
          <p className="text-xs font-light leading-relaxed">
            {project?.description || "未指派看板背景说明。您可以点击“新建任务”增设待跟进卡片，或点击“AI 智能项目诊断”进行看板健康度排查。"}
          </p>
        </div>

        {/* 3-Column 看板栅格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
          
          {/* 列 1: 待处理 */}
          <div className="flex flex-col rounded-xl glass-panel p-4 gap-4 bg-slate-950/20 border border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">待处理 (Todo)</h3>
              </div>
              <span className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                {todoTasks.length}
              </span>
            </div>
            
            <div className="flex flex-col gap-3 min-h-[400px]">
              {todoTasks.map((t) => (
                <TaskCard key={t.id} task={t} profiles={profiles} onTransition={handleTransition} onDelete={handleDeleteTask} />
              ))}
              {todoTasks.length === 0 && (
                <div className="flex-1 border border-dashed border-white/5 rounded-xl flex items-center justify-center p-8 text-center text-slate-500 text-xs font-light">
                  暂无积压待开发事项
                </div>
              )}
            </div>
          </div>

          {/* 列 2: 进行中 */}
          <div className="flex flex-col rounded-xl glass-panel p-4 gap-4 bg-slate-950/20 border border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">进行中 (Doing)</h3>
              </div>
              <span className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                {doingTasks.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 min-h-[400px]">
              {doingTasks.map((t) => (
                <TaskCard key={t.id} task={t} profiles={profiles} onTransition={handleTransition} onDelete={handleDeleteTask} />
              ))}
              {doingTasks.length === 0 && (
                <div className="flex-1 border border-dashed border-white/5 rounded-xl flex items-center justify-center p-8 text-center text-slate-500 text-xs font-light">
                  无进行中的研发事项
                </div>
              )}
            </div>
          </div>

          {/* 列 3: 已完成 */}
          <div className="flex flex-col rounded-xl glass-panel p-4 gap-4 bg-slate-950/20 border border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">已完成 (Done)</h3>
              </div>
              <span className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                {doneTasks.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 min-h-[400px]">
              {doneTasks.map((t) => (
                <TaskCard key={t.id} task={t} profiles={profiles} onTransition={handleTransition} onDelete={handleDeleteTask} />
              ))}
              {doneTasks.length === 0 && (
                <div className="flex-1 border border-dashed border-white/5 rounded-xl flex items-center justify-center p-8 text-center text-slate-500 text-xs font-light">
                  暂无已完成的事项
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* 创建任务弹窗 */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl glass-panel glow-border p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white tracking-tight mb-2">在看板中增设任务</h3>
            <p className="text-slate-400 text-xs mb-5 font-light">新建一个需要团队成员执行的项目卡片。</p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">任务名称</label>
                <input
                  type="text"
                  placeholder="例如：开发第三方认证登录逻辑"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full h-10 px-4 rounded-lg glass-input text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">任务说明</label>
                <textarea
                  placeholder="详细列出开发所需入参、具体预期效果等..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full h-20 px-4 py-2 rounded-lg glass-input text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">优先级</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e: any) => setNewTaskPriority(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg glass-input text-xs bg-[#0b0726] cursor-pointer"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">执行人</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg glass-input text-xs bg-[#0b0726] cursor-pointer"
                  >
                    <option value="">未指派人员</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">截止日期</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full h-10 px-4 rounded-lg glass-input text-xs cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="h-9 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="h-9 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {creatingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "新建任务"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI 诊断抽屉式侧面板 */}
      {showInsights && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg h-full bg-[#0b0726]/90 border-l border-white/5 p-6 flex flex-col justify-between shadow-2xl relative animate-in slide-in-from-right duration-300">
            
            <div className="flex flex-col gap-6 overflow-y-auto flex-1 pb-6">
              
              {/* 抽屉头部 */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">AI 看板智能诊断报告</h3>
                    <p className="text-[10px] text-slate-400 font-light">由 Python FastAPI 智能分析引擎驱动</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInsights(false)}
                  className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* 内容加载或展示 */}
              {insightsLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
                  <span className="text-xs font-light">FastAPI 正在加载任务快照评估中...</span>
                </div>
              ) : insightReport ? (
                <div className="space-y-4">
                  {/* 本地 Demo 提示块 */}
                  {insightReport.is_demo && (
                    <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 flex gap-2.5 items-start">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div className="text-[10px] leading-relaxed">
                        <span className="font-semibold block">本地演示降级模式已激活</span>
                        检测到未配置有效的 LLM API 密钥。系统已为您自动生成高保真的静态快照分析。
                      </div>
                    </div>
                  )}

                  {/* 诊断正文 */}
                  <div className="prose prose-invert prose-xs max-w-none text-slate-300">
                    {renderMarkdown(insightReport.content)}
                  </div>

                  <div className="border-t border-white/5 pt-4 text-[10px] text-slate-500 flex justify-between">
                    <span>诊断引擎: {insightReport.model}</span>
                    <span>诊断状态：已完成</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-20 text-slate-500 text-xs font-light">
                  未生成任何诊断分析。
                </div>
              )}

            </div>

            <div className="border-t border-white/5 pt-4 flex items-center justify-end">
              <button
                onClick={() => setShowInsights(false)}
                className="h-9 px-5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                关闭报告
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// 任务卡片内部组件
function TaskCard({ 
  task, 
  profiles, 
  onTransition, 
  onDelete 
}: { 
  task: Task; 
  profiles: Profile[]; 
  onTransition: (id: string, status: string, dir: "next" | "prev") => void; 
  onDelete: (id: string) => void;
}) {
  const assigneeName = profiles.find((p) => p.id === task.assignee_id)?.full_name || "未指派";

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-pink-500/10 text-pink-400 border border-pink-500/20";
      case "low":
        return "bg-slate-800 text-slate-400 border border-white/5";
      default:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high": return "高";
      case "low": return "低";
      default: return "中";
    }
  };

  return (
    <div className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all duration-200 shadow-sm flex flex-col gap-3">
      
      {/* 顶部标签 */}
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded tracking-wider ${getPriorityStyle(task.priority)}`}>
          {getPriorityLabel(task.priority)}优先级
        </span>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all cursor-pointer"
          title="删除任务"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 任务内容 */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
        <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed font-light">
          {task.description || "无任何工作说明。"}
        </p>
      </div>

      {/* 执行人与截至排期 */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[9px] text-slate-500">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-slate-500" />
          <span className="truncate max-w-[80px]" title={assigneeName}>{assigneeName}</span>
        </div>
        
        {task.due_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* 看板向左向右扭转按钮 */}
      <div className="flex items-center justify-end gap-1.5 pt-1">
        {task.status !== "todo" && (
          <button
            onClick={() => onTransition(task.id, task.status, "prev")}
            className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            title="向左移动"
          >
            ‹
          </button>
        )}
        {task.status !== "done" && (
          <button
            onClick={() => onTransition(task.id, task.status, "next")}
            className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            title="向右移动"
          >
            ›
          </button>
        )}
      </div>

    </div>
  );
}

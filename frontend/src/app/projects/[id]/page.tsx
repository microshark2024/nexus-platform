// frontend/src/app/projects/[id]/page.tsx
"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Sparkles, Plus, Trash2, Check, ArrowRight, ArrowLeftSquare, 
  Loader2, User, Calendar, AlertTriangle, Lightbulb, Play, CheckCircle2, ShieldAlert
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

  // Realtime ref for RLS DELETE workaround
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Modals state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // AI insights state
  const [showInsights, setShowInsights] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightReport, setInsightReport] = useState<any>(null);

  // Load project details, tasks, and members profiles
  const loadData = useCallback(async () => {
    try {
      // 1. Load project info
      const { data: projData, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projError) throw projError;
      setProject(projData);

      // 2. Load tasks in this project
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // 3. Load active workspace members profiles for assignee dropdown
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
      toast.error("Failed to load project details.");
      console.error(err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  // Auth checker
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

  // Load project data
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Realtime subscription setup
  useEffect(() => {
    if (!projectId) return;

    // Subscribes without project-level filter to capture DELETE updates cleanly under RLS rules
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
              // Removed from project
              setTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            // Check in-memory tasksRef to verify if deleted item belongs to current UI state
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

  // Update task status transition
  const handleTransition = async (taskId: string, currentStatus: string, direction: "next" | "prev") => {
    let nextStatus: "todo" | "doing" | "done" = "todo";
    if (direction === "next") {
      nextStatus = currentStatus === "todo" ? "doing" : "done";
    } else {
      nextStatus = currentStatus === "done" ? "doing" : "todo";
    }

    try {
      // Optimistic Update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );

      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", taskId);

      if (error) throw error;
      
      // Trigger instant refresh
      await loadData();
    } catch (err: any) {
      toast.error("Failed to transition task status.");
      // Rollback to original state on error
      loadData();
    }
  };

  // Delete task action
  const handleDeleteTask = async (taskId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this task?");
    if (!confirm) return;

    try {
      // Optimistic Update
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Task deleted.");
    } catch (err: any) {
      toast.error("Failed to delete task.");
      loadData();
    }
  };

  // Create Task action
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

      toast.success("Task added to Kanban Board.");
      setShowTaskModal(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("medium");
      setNewTaskAssignee("");
      setNewTaskDueDate("");
      
      // Reload page state
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add task.");
    } finally {
      setCreatingTask(false);
    }
  };

  // AI Insights Generation call
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
        throw new Error(`Server returned error status ${response.status}`);
      }

      const report = await response.json();
      setInsightReport(report);
    } catch (err: any) {
      toast.error("Failed to load AI Insights. Please check if backend service is running.");
      setShowInsights(false);
      console.error(err);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Helper to parse basic markdown format into JSX/HTML safely
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return "";
    let html = markdown
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Blockquotes
    html = html.replace(/^\s*>\s*(.*)$/gm, '<blockquote class="border-l-2 border-violet-500 pl-3.5 py-0.5 my-3 bg-violet-500/5 text-slate-300 italic font-light">$1</blockquote>');

    // Headers
    html = html.replace(/^\s*###\s+(.*)$/gm, '<h4 class="text-xs font-bold text-violet-400 mt-4 mb-2 uppercase tracking-wide flex items-center gap-1.5">⚡ $1</h4>');
    html = html.replace(/^\s*##\s+(.*)$/gm, '<h3 class="text-sm font-bold text-white border-b border-white/5 pb-1 mt-5 mb-3">$1</h3>');
    html = html.replace(/^\s*#\s+(.*)$/gm, '<h2 class="text-base font-extrabold text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text mt-6 mb-4">$1</h2>');

    // Lists
    html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li class="ml-4 list-disc text-slate-300 text-xs my-1 leading-relaxed">$1</li>');

    // Bold & italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>');

    // Code blocks
    html = html.replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-fuchsia-400 font-mono text-[10px]">$1</code>');

    // Horizontal separator
    html = html.replace(/^\s*---\s*$/gm, '<hr class="border-white/5 my-4" />');

    // Line breaks
    html = html.replace(/\n\n/g, "</p><p class='text-xs text-slate-400 my-2 leading-relaxed'>");

    return <div dangerouslySetInnerHTML={{ __html: `<p class='text-xs text-slate-400 my-2 leading-relaxed'>${html}</p>` }} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <span className="text-sm font-light">Loading Kanban Board...</span>
      </div>
    );
  }

  // Filter tasks into columns
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const doingTasks = tasks.filter((t) => t.status === "doing");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col font-sans relative">
      
      {/* Background radial highlight */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[150px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Header bar */}
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
            <p className="text-[10px] text-slate-400 font-light">Kanban Board</p>
          </div>
        </div>

        {/* AI Insight Trigger & Add Task */}
        <div className="flex items-center gap-3">
          <button
            onClick={triggerAIInsights}
            className="h-9 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-2 text-violet-300 hover:text-violet-200 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            AI Smart Insights
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/10 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </header>

      {/* Kanban Board Container */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        
        {/* Project Context Summary */}
        <div className="p-4 rounded-xl glass-panel text-slate-300 flex flex-col gap-1.5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Project Context</h3>
          <p className="text-xs font-light leading-relaxed">
            {project?.description || "No project overview description provided. Click 'Add Task' to assign items or 'AI Smart Insights' to request snapshot diagnostics."}
          </p>
        </div>

        {/* 3-Column Kanban Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
          
          {/* Column 1: TODO */}
          <div className="flex flex-col rounded-xl glass-panel p-4 gap-4 bg-slate-950/20 border border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">To Do</h3>
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
                  No pending tasks
                </div>
              )}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div className="flex flex-col rounded-xl glass-panel p-4 gap-4 bg-slate-950/20 border border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">In Progress</h3>
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
                  No active tasks
                </div>
              )}
            </div>
          </div>

          {/* Column 3: DONE */}
          <div className="flex flex-col rounded-xl glass-panel p-4 gap-4 bg-slate-950/20 border border-white/5">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Done</h3>
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
                  No completed tasks
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* ADD TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl glass-panel glow-border p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white tracking-tight mb-2">Add Kanban Task</h3>
            <p className="text-slate-400 text-xs mb-5 font-light">Add a card containing a single backlog requirement.</p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Implement login logic"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full h-10 px-4 rounded-lg glass-input text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Details about task execution, mock params, or expectations..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full h-20 px-4 py-2 rounded-lg glass-input text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e: any) => setNewTaskPriority(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg glass-input text-xs bg-[#0b0726] cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg glass-input text-xs bg-[#0b0726] cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Due Date</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="h-9 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {creatingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI INSIGHTS DRAWER (RIGHT PANEL) */}
      {showInsights && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg h-full bg-[#0b0726]/90 border-l border-white/5 p-6 flex flex-col justify-between shadow-2xl relative animate-in slide-in-from-right duration-300">
            
            <div className="flex flex-col gap-6 overflow-y-auto flex-1 pb-6">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">AI Workspace Insights</h3>
                    <p className="text-[10px] text-slate-400 font-light">Powered by FastAPI Analytical Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInsights(false)}
                  className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Insights content loading or display */}
              {insightsLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
                  <span className="text-xs font-light">FastAPI analyzing task snapshot...</span>
                </div>
              ) : insightReport ? (
                <div className="space-y-4">
                  {/* Demo indicator block */}
                  {insightReport.is_demo && (
                    <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 flex gap-2.5 items-start">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div className="text-[10px] leading-relaxed">
                        <span className="font-semibold block">Demo Mode Enabled</span>
                        The API key is currently unset or contains a placeholder. Showing local model evaluation snapshot.
                      </div>
                    </div>
                  )}

                  {/* Generated Markdown content rendered */}
                  <div className="prose prose-invert prose-xs max-w-none text-slate-300">
                    {renderMarkdown(insightReport.content)}
                  </div>

                  <div className="border-t border-white/5 pt-4 text-[10px] text-slate-500 flex justify-between">
                    <span>Engine: {insightReport.model}</span>
                    <span>Status: Analyzed</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-20 text-slate-500 text-xs font-light">
                  No insights report generated.
                </div>
              )}

            </div>

            <div className="border-t border-white/5 pt-4 flex items-center justify-end">
              <button
                onClick={() => setShowInsights(false)}
                className="h-9 px-5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Close Insights
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// INNER CARD COMPONENT FOR TASK DISPLAY
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
  const assigneeName = profiles.find((p) => p.id === task.assignee_id)?.full_name || "Unassigned";

  // Priority color scheme styles
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

  return (
    <div className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all duration-200 shadow-sm flex flex-col gap-3">
      
      {/* Top badges */}
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded tracking-wider ${getPriorityStyle(task.priority)}`}>
          {task.priority}
        </span>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all cursor-pointer"
          title="Delete Task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task Content */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
        <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed font-light">
          {task.description || "No description provided."}
        </p>
      </div>

      {/* Date & Assignee Details */}
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

      {/* Kanban Navigation Controls */}
      <div className="flex items-center justify-end gap-1.5 pt-1">
        {task.status !== "todo" && (
          <button
            onClick={() => onTransition(task.id, task.status, "prev")}
            className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            title="Move Backward"
          >
            ‹
          </button>
        )}
        {task.status !== "done" && (
          <button
            onClick={() => onTransition(task.id, task.status, "next")}
            className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            title="Move Forward"
          >
            ›
          </button>
        )}
      </div>

    </div>
  );
}

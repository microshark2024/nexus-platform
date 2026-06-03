// frontend/src/app/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, Plus, LayoutGrid, CheckCircle2, 
  LogOut, ArrowRight, Loader2, FolderKanban,
  Building, User, Compass, Briefcase, FileText
} from "lucide-react";
import { toast } from "sonner";
import { ensureDefaultWorkspace } from "@/lib/workspace";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 工作空间状态
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  // 项目状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // 数据看板状态
  const [stats, setStats] = useState({
    activeProjects: 0,
    doingTasks: 0,
    totalTasks: 0,
  });

  // 验证会话
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [router]);

  // 加载工作空间列表
  const loadWorkspaces = useCallback(async (userId: string, email: string) => {
    try {
      const { data: memberships, error: memError } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(id, name, slug)");

      if (memError) throw memError;

      const wsList: Workspace[] = (memberships || [])
        .map((m: any) => m.workspaces)
        .filter(Boolean);

      setWorkspaces(wsList);

      if (wsList.length > 0) {
        if (!activeWorkspace) {
          setActiveWorkspace(wsList[0]);
        } else {
          const exists = wsList.find(w => w.id === activeWorkspace.id);
          if (!exists) setActiveWorkspace(wsList[0]);
        }
      } else {
        // 无工作空间时自动生成默认空间
        const defaultId = await ensureDefaultWorkspace(userId, email);
        const { data: wsData } = await supabase
          .from("workspaces")
          .select("id, name, slug")
          .eq("id", defaultId)
          .single();
        if (wsData) {
          setWorkspaces([wsData]);
          setActiveWorkspace(wsData);
        }
      }
    } catch (err: any) {
      toast.error("加载工作空间列表异常。");
      console.error(err);
    }
  }, [activeWorkspace]);

  // 加载项目列表与统计指标
  const loadWorkspaceDetails = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const { data: projData, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: false });

      if (projError) throw projError;
      setProjects(projData || []);

      const activeProjCount = (projData || []).filter(p => p.status === "active").length;

      let doingCount = 0;
      let totalCount = 0;

      if (projData && projData.length > 0) {
        const projectIds = projData.map(p => p.id);
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("id, status")
          .in("project_id", projectIds);

        if (tasksError) throw tasksError;

        if (tasksData) {
          totalCount = tasksData.length;
          doingCount = tasksData.filter(t => t.status === "doing").length;
        }
      }

      setStats({
        activeProjects: activeProjCount,
        doingTasks: doingCount,
        totalTasks: totalCount,
      });
    } catch (err: any) {
      toast.error("更新工作空间看板统计指标失败。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (user) {
      loadWorkspaces(user.id, user.email || "");
    }
  }, [user, loadWorkspaces]);

  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceDetails();
    } else if (workspaces.length === 0 && !loading) {
      // 保持加载状态
    } else {
      setLoading(false);
    }
  }, [activeWorkspace, workspaces, loadWorkspaceDetails, loading]);

  // 创建工作空间
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim() || !user) return;

    setCreatingWorkspace(true);
    try {
      const slug = `workspace-${user.id.substring(0, 4)}-${Math.random().toString(36).substring(2, 8)}`;
      const { data: newWs, error: wsError } = await supabase
        .from("workspaces")
        .insert({
          name: newWsName,
          slug,
          owner_id: user.id,
        })
        .select()
        .single();

      if (wsError) throw wsError;

      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: newWs.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      toast.success("工作空间创建成功！");
      setNewWsName("");
      setShowWorkspaceModal(false);
      
      setWorkspaces(prev => [...prev, newWs]);
      setActiveWorkspace(newWs);
    } catch (err: any) {
      toast.error(err.message || "创建工作空间失败。");
    } finally {
      setCreatingWorkspace(false);
    }
  };

  // 创建项目
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !activeWorkspace || !user) return;

    setCreatingProject(true);
    try {
      const { data: newProj, error: projError } = await supabase
        .from("projects")
        .insert({
          workspace_id: activeWorkspace.id,
          name: newProjName,
          description: newProjDesc,
          status: "active",
          created_by: user.id,
        })
        .select()
        .single();

      if (projError) throw projError;

      toast.success("新项目画布创建成功！");
      setNewProjName("");
      setNewProjDesc("");
      setShowProjectModal(false);
      
      setProjects(prev => [newProj, ...prev]);
      setStats(prev => ({
        ...prev,
        activeProjects: prev.activeProjects + 1
      }));
    } catch (err: any) {
      toast.error(err.message || "创建项目画布失败。");
    } finally {
      setCreatingProject(false);
    }
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("账户已安全登出。");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "退出登录异常。");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <span className="text-sm font-light">正在加载 Nexus 工作台...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-slate-100 flex flex-col font-sans">
      
      {/* 渐变装饰 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[150px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />

      {/* 导航栏 */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              NEXUS
            </span>
          </Link>
          
          {/* 顶部工作空间下拉选择器 */}
          {activeWorkspace && (
            <div className="flex items-center gap-2.5">
              <span className="text-slate-600">/</span>
              <div className="relative inline-block text-left">
                <select
                  value={activeWorkspace.id}
                  onChange={(e) => {
                    const ws = workspaces.find(w => w.id === e.target.value);
                    if (ws) setActiveWorkspace(ws);
                  }}
                  className="bg-white/5 hover:bg-white/10 text-white font-medium text-xs rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer transition-all pr-8 appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '12px'
                  }}
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id} className="bg-[#0b0726] text-white">
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={() => setShowWorkspaceModal(true)}
                className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                title="新建工作空间"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 账户状态及退出 */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-3 py-1 text-xs text-slate-300">
            <User className="w-3.5 h-3.5 text-violet-400" />
            <span>{user?.email}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 flex items-center justify-center text-slate-400 transition-all cursor-pointer"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 主面板内容 */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* 空间标题与操作 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              {activeWorkspace?.name || "工作空间仪表盘"}
            </h1>
            <p className="text-slate-400 text-xs mt-1 font-light flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-violet-400" />
              管理当前工作空间下的所有敏捷项目，追踪进行中的指标，对齐研发链路。
            </p>
          </div>
          
          <button
            onClick={() => setShowProjectModal(true)}
            className="h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold px-5 rounded-lg flex items-center gap-2 shadow-md shadow-violet-500/10 cursor-pointer self-start sm:self-center transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
        </div>

        {/* 统计指标卡片 */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          <div className="glass-panel p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">活跃项目总数</span>
              <span className="text-2xl font-bold text-white tracking-tight">{stats.activeProjects}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">开发中任务</span>
              <span className="text-2xl font-bold text-white tracking-tight">{stats.doingTasks}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">累计任务指标</span>
              <span className="text-2xl font-bold text-white tracking-tight">{stats.totalTasks}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

        </section>

        {/* 看板列表 */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-violet-400" />
            工作空间项目看板
          </h2>

          {projects.length === 0 ? (
            <div className="rounded-xl glass-panel p-12 text-center flex flex-col items-center justify-center gap-4">
              <Briefcase className="w-10 h-10 text-slate-500" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">暂无项目看板</h3>
                <p className="text-xs text-slate-400 max-w-sm">在该空间下创建您的首个敏捷任务画布以开启协作。</p>
              </div>
              <button
                onClick={() => setShowProjectModal(true)}
                className="h-9 bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                创建首个项目
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="group rounded-xl glass-panel glass-panel-hover p-5 flex flex-col justify-between h-44 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-violet-400 transition-colors">
                        {proj.name}
                      </h3>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                        proj.status === "active" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "bg-slate-800 text-slate-400"
                      }`}>
                        {proj.status === "active" ? "活跃" : proj.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs font-light line-clamp-3 leading-relaxed">
                      {proj.description || "未对此项目填写任何描述说明。"}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-white/5 text-[10px] text-slate-500">
                    <span>创建日期: {new Date(proj.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-violet-400 font-medium group-hover:translate-x-1 transition-transform">
                      进入项目画布 <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* 创建工作空间弹窗 */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl glass-panel glow-border p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white tracking-tight mb-2">创建新工作空间</h3>
            <p className="text-slate-400 text-xs mb-5 font-light">为不同的团队或独立项目群开辟一个新的开发与隔离空间。</p>
            
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">工作空间名称</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="例如：视觉研发组"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-lg glass-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWorkspaceModal(false);
                    setNewWsName("");
                  }}
                  className="h-9 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creatingWorkspace}
                  className="h-9 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {creatingWorkspace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "确 认"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 创建项目看板弹窗 */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl glass-panel glow-border p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white tracking-tight mb-2">创建新项目看板</h3>
            <p className="text-slate-400 text-xs mb-5 font-light">在当前选择的工作空间下添加一个全新的协作看板，以便指派研发任务。</p>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">项目名称</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="例如：Q3 极光官网构建"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-lg glass-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">描述信息</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <textarea
                    placeholder="简要填写项目周期、开发重点或里程碑说明..."
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    className="w-full h-24 pl-10 pr-4 py-2.5 rounded-lg glass-input text-xs resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectModal(false);
                    setNewProjName("");
                    setNewProjDesc("");
                  }}
                  className="h-9 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="h-9 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {creatingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "新建项目"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

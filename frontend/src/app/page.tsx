// frontend/src/app/page.tsx
import Link from "next/link";
import { ArrowRight, Sparkles, Kanban, RefreshCw, Zap, MessageSquare } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#030014] overflow-hidden flex flex-col font-sans">
      
      {/* 装饰渐变光球 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] rounded-full bg-purple-900/15 blur-[100px] pointer-events-none" />

      {/* 顶部导航 */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            NEXUS
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            登录
          </Link>
          <Link 
            href="/signup" 
            className="text-sm font-medium bg-white/10 hover:bg-white/15 text-white px-4 h-9 flex items-center rounded-lg border border-white/10 transition-all duration-200"
          >
            免费注册
          </Link>
        </nav>
      </header>

      {/* Hero 核心区域 */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        
        {/* Banner 公告 */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 font-medium mb-8 animate-fade-in shadow-[0_0_15px_rgba(139,92,246,0.1)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>全新推出 Nexus AI 智能诊断引擎 v1.0</span>
        </div>

        {/* Hero 标题 */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.15] max-w-4xl">
          专为研发协作打造的
          <span className="block mt-2 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent text-glow">
            新一代 AI 智能平台
          </span>
        </h1>

        {/* Hero 副标题 */}
        <p className="text-base md:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed font-light">
          借助毫秒级实时同步看板、防循环安全隔离的工作空间，以及一键化 AI 看板深度运营分析，带给您的团队前所未有的敏捷开发与协同体验。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link 
            href="/signup" 
            className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium px-8 h-12 rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200"
          >
            免费开始使用
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 text-white font-medium px-8 h-12 rounded-xl border border-white/10 transition-all duration-200"
          >
            登录工作台
          </Link>
        </div>

        {/* 磨砂玻璃看板 Mockup 展示 */}
        <div className="w-full relative rounded-2xl overflow-hidden glass-panel glow-border p-3 md:p-4 shadow-2xl">
          <div className="rounded-xl overflow-hidden bg-slate-950/80 border border-white/5 flex flex-col">
            
            {/* 窗口控制条 */}
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="text-xs text-slate-500 font-mono">nexus-board-view</div>
              <div className="w-12" />
            </div>

            {/* 看板预览内容 */}
            <div className="p-6 text-left grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 栏目 1: 待办 */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>待处理 (To Do)</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">2</span>
                </div>
                
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-pink-400 font-medium px-2 py-0.5 bg-pink-500/10 rounded">高优先级</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">重构后端 CORS 配置逻辑</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2">支持兼容 Union[List[str], str] 类型，防止逗号分隔加载报错。</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-violet-400 font-medium px-2 py-0.5 bg-violet-500/10 rounded">中优先级</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">完善首屏视觉动效</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2">采用 Outfit 现代字体，并新增流畅的极光背景渐变。</p>
                </div>
              </div>

              {/* 栏目 2: 进行中 */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>进行中 (Doing)</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">1</span>
                </div>
                
                <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 flex flex-col gap-3 shadow-inner">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-violet-400 font-medium px-2 py-0.5 bg-violet-500/10 rounded">高优先级</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">集成 FastAPI AI 诊断接口</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2">前端点击 Insights 按钮后，编译当前任务快照向后端发送分析请求。</p>
                </div>
              </div>

              {/* 栏目 3: 已完成 */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>已完成 (Done)</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">1</span>
                </div>
                
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 opacity-60 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 rounded">低优先级</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-through">配置 Supabase 表结构及 RLS</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2">编写防无限递归的 PostgreSQL SECURITY DEFINER 辅助函数。</p>
                </div>
              </div>

            </div>

          </div>
        </div>

      </main>

      {/* 核心特性网格 */}
      <section className="relative z-10 py-20 bg-slate-950/40 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-16 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            为高效研发团队量身打造
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* 特性 1 */}
            <div className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Kanban className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">直观敏捷看板</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-light">
                简洁直观的 Todo、Doing、Done 任务流动设计。一键实现状态卡片横向迁移，自动重排，进度尽在掌控。
              </p>
            </div>

            {/* 特性 2 */}
            <div className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI 智能诊断洞察</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-light">
                一键向后端的 FastAPI 发送任务快照请求。AI 将帮您指出当前交付瓶颈、潜在逾期风险并给出人员建议。
              </p>
            </div>

            {/* 特性 3 */}
            <div className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">数据秒级实时同步</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-light">
                依托 Supabase Realtime 底层通道。无论是卡片状态修改、任务增删，都会在同一工作空间内瞬时多端同步。
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 text-slate-500 text-xs gap-4">
        <span>© 2026 Nexus 协作平台. 保留所有权利.</span>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-slate-300">隐私政策</Link>
          <Link href="#" className="hover:text-slate-300">服务条款</Link>
          <Link href="#" className="hover:text-slate-300">系统状态</Link>
        </div>
      </footer>

    </div>
  );
}

// frontend/src/app/page.tsx
import Link from "next/link";
import { ArrowRight, Sparkles, Kanban, RefreshCw, Shield, Zap, MessageSquare } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#030014] overflow-hidden flex flex-col font-sans">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] rounded-full bg-purple-900/15 blur-[100px] pointer-events-none" />

      {/* Header */}
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
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className="text-sm font-medium bg-white/10 hover:bg-white/15 text-white px-4 h-9 flex items-center rounded-lg border border-white/10 transition-all duration-200"
          >
            Create Account
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        
        {/* Banner Announcement */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 font-medium mb-8 animate-fade-in shadow-[0_0_15px_rgba(139,92,246,0.1)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Introducing Nexus AI Insights Engine v1.0</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] max-w-4xl">
          The Professional AI Platform for
          <span className="block mt-2 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent text-glow">
            Collaborative Projects
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed font-light">
          Supercharge your workflow with real-time Kanban synchronization, workspace safety policies, and automated AI insights that spot risks before they happen.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link 
            href="/signup" 
            className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium px-8 h-12 rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200"
          >
            Start For Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 text-white font-medium px-8 h-12 rounded-xl border border-white/10 transition-all duration-200"
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Glassmorphic Mockup Showcase */}
        <div className="w-full relative rounded-2xl overflow-hidden glass-panel glow-border p-3 md:p-4 shadow-2xl">
          <div className="rounded-xl overflow-hidden bg-slate-950/80 border border-white/5 flex flex-col">
            
            {/* Window bar */}
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="text-xs text-slate-500 font-mono">nexus-board-view</div>
              <div className="w-12" />
            </div>

            {/* Content Preview */}
            <div className="p-6 text-left grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Column 1 */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>To Do</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">2</span>
                </div>
                
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-pink-400 font-medium px-2 py-0.5 bg-pink-500/10 rounded">High</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">Refactor auth flow for SSR compatibility</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">Ensure server side cookie sessions match local Supabase clients.</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-violet-400 font-medium px-2 py-0.5 bg-violet-500/10 rounded">Medium</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">Create landing page styles</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">Incorporate Outfit fonts and neon radial gradients.</p>
                </div>
              </div>

              {/* Column 2 */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>In Progress</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">1</span>
                </div>
                
                <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 flex flex-col gap-3 shadow-inner">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-violet-400 font-medium px-2 py-0.5 bg-violet-500/10 rounded">High</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">Integrate FastAPI /ai/insights Endpoint</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">Ensure snapshots compile correctly into LLM client templates.</p>
                </div>
              </div>

              {/* Column 3 */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Done</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">1</span>
                </div>
                
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 opacity-60 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 rounded">Low</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white line-through">Configure Supabase tables & RLS</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">Avoid recursive policies with custom SQL helpers.</p>
                </div>
              </div>

            </div>

          </div>
        </div>

      </main>

      {/* Feature Cards Grid */}
      <section className="relative z-10 py-20 bg-slate-950/40 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Engineered for High-Performance Teams
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Kanban className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic Kanban Board</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Organize projects cleanly with visual Todo, In Progress, and Done cards. Seamlessly transition states with instant updates.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI Insights Advisory</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Generate project reports, task prioritizations, and critical bottlenecks in one-click via Python FastAPI and LLM analysis.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-panel glass-panel-hover p-8 rounded-2xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Real-Time DB Sync</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Powered by Supabase Realtime. Tasks sync instantly across other browser windows and active team members.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 text-slate-500 text-xs gap-4">
        <span>© 2026 Nexus Platform Inc. All rights reserved.</span>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-slate-300">Privacy Policy</Link>
          <Link href="#" className="hover:text-slate-300">Terms of Use</Link>
          <Link href="#" className="hover:text-slate-300">Status</Link>
        </div>
      </footer>

    </div>
  );
}

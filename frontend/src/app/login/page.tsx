// frontend/src/app/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureDefaultWorkspace } from "@/lib/workspace";
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("请填写所有字段。");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("验证返回空用户数据。");

      toast.success("登录成功！");
      
      // Auto-provision default workspace if they don't have one
      toast.promise(
        ensureDefaultWorkspace(data.user.id, data.user.email || "user"),
        {
          loading: "正在配置工作空间...",
          success: () => {
            router.push("/dashboard");
            return "工作空间配置完毕！";
          },
          error: "配置默认工作空间失败。",
        }
      );
    } catch (err: any) {
      toast.error(err.message || "登录失败。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030014] flex items-center justify-center p-6 overflow-hidden">
      
      {/* 装饰渐变背景 */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-fuchsia-600/10 blur-[80px] pointer-events-none" />

      {/* 磨砂玻璃表单容器 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl glass-panel glow-border p-8 shadow-2xl">
        
        {/* 头部品牌 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              NEXUS
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-white tracking-tight">欢迎回来</h2>
          <p className="text-slate-400 text-sm mt-1.5 font-light">
            登录以访问您的工作空间与看板项目
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">电子邮箱 (Email Address)</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-lg glass-input text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">密码 (Password)</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-lg glass-input text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-md shadow-violet-500/10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                登 录
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 账户注册切换 */}
        <div className="text-center mt-6 pt-6 border-t border-white/5 text-xs text-slate-400">
          还没有 Nexus 账号？{" "}
          <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            立即注册
          </Link>
        </div>

      </div>
    </div>
  );
}

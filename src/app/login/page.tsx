'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint =
      tab === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error?.message ||
            (tab === 'login' ? '登入失敗，請檢查帳號密碼' : '註冊失敗，請稍後再試')
        );
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#6366f1]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#8b5cf6]/10 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-lg shadow-[#6366f1]/30">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">AI 圖片合成系統</h1>
          <p className="mt-1 text-sm text-[#64748b]">使用 AI 技術打造你的創意圖片</p>
        </div>

        <div className="glass-card p-6">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-[#0f172a]/50 p-1">
            <button
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              登入
            </button>
            <button
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                tab === 'register'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              註冊
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[#94a3b8]"
              >
                電子信箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full rounded-lg border border-[#334155] bg-[#1e293b]/50 px-4 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] transition-all focus:border-[#6366f1] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 hover:border-[#475569]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-[#94a3b8]"
              >
                密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={tab === 'register' ? '至少 6 個字元' : '請輸入密碼'}
                className="w-full rounded-lg border border-[#334155] bg-[#1e293b]/50 px-4 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] transition-all focus:border-[#6366f1] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 hover:border-[#475569]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2.5 text-sm text-[#ef4444]">
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] py-2.5 text-sm font-medium text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:shadow-[#6366f1]/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {tab === 'login' ? '登入中...' : '註冊中...'}
                </span>
              ) : tab === 'login' ? (
                '登入'
              ) : (
                '建立帳號'
              )}
            </button>
          </form>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-[#64748b] transition-colors hover:text-[#6366f1]"
          >
            &larr; 返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

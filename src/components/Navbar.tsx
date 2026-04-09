'use client';

import Link from 'next/link';

interface NavbarProps {
  user: { email: string } | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-border backdrop-blur-xl bg-[#0f172a]/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo + Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-lg shadow-[#6366f1]/20">
              <svg
                className="h-5 w-5 text-white"
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
            <span className="text-lg font-bold gradient-text group-hover:opacity-80 transition-opacity">
              AI 圖片合成系統
            </span>
          </Link>

          {/* Right: User info or login */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="hidden sm:inline-block text-sm text-[#94a3b8]">
                  {user.email}
                </span>
                <button
                  onClick={onLogout}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-[#94a3b8] transition-all hover:border-[#6366f1]/50 hover:text-white hover:bg-[#6366f1]/10"
                >
                  登出
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:shadow-[#6366f1]/40 hover:brightness-110"
              >
                登入
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

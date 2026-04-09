'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import QuotaDisplay from '@/components/QuotaDisplay';
import ImageUpload from '@/components/ImageUpload';
import PromptInput from '@/components/PromptInput';
import ProgressBar from '@/components/ProgressBar';
import ResultViewer from '@/components/ResultViewer';
import HistoryList from '@/components/HistoryList';

interface User {
  email: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Compose state
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [topImage, setTopImage] = useState<File | null>(null);
  const [bottomImage, setBottomImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        // Try to get quota — if it works, user is authenticated
        const res = await fetch('/api/v1/quota', { credentials: 'include' });
        if (res.ok) {
          // Fetch user info from a lightweight endpoint, or decode from cookie
          // For now, we'll try the jobs endpoint to confirm auth
          const jobsRes = await fetch('/api/v1/jobs?limit=1', {
            credentials: 'include',
          });
          if (jobsRes.ok) {
            // User is authenticated. We don't have a dedicated /me endpoint,
            // so we'll use a placeholder until one is available.
            setUser({ email: '使用者' });
          }
        }
      } catch {
        // Not authenticated
      } finally {
        setUserLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    setUser(null);
    router.refresh();
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!modelImage || !topImage || !bottomImage || !prompt.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    setCompletedJobId(null);

    try {
      const formData = new FormData();
      formData.append('modelImage', modelImage);
      formData.append('topImage', topImage);
      formData.append('bottomImage', bottomImage);
      formData.append('prompt', prompt);

      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || '提交失敗，請稍後再試');
      }

      const data = await res.json();
      setJobId(data.jobId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交失敗');
    } finally {
      setSubmitting(false);
    }
  }, [modelImage, topImage, bottomImage, prompt]);

  const handleComplete = useCallback((completedId: string) => {
    setCompletedJobId(completedId);
    setJobId(null);
  }, []);

  const handleError = useCallback((error: string) => {
    setSubmitError(error);
    setJobId(null);
  }, []);

  const handleReset = useCallback(() => {
    setModelImage(null);
    setTopImage(null);
    setBottomImage(null);
    setPrompt('');
    setJobId(null);
    setCompletedJobId(null);
    setSubmitError(null);
  }, []);

  const handleSelectJob = useCallback((selectedJobId: string) => {
    setCompletedJobId(selectedJobId);
    setJobId(null);
  }, []);

  const isProcessing = !!jobId || submitting;
  const charCount = [...prompt].length;
  const canSubmit =
    !!modelImage && !!topImage && !!bottomImage &&
    prompt.trim().length > 0 && charCount <= 1000 && !isProcessing;

  // Show login prompt if not authenticated
  if (!userLoading && !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar user={null} onLogout={handleLogout} />
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          {/* Background decorations */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -left-40 top-1/4 h-80 w-80 rounded-full bg-[#6366f1]/5 blur-3xl" />
            <div className="absolute -right-40 top-1/2 h-80 w-80 rounded-full bg-[#8b5cf6]/5 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-2xl shadow-[#6366f1]/30">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold gradient-text sm:text-4xl">
              AI 圖片合成系統
            </h1>
            <p className="max-w-md text-[#94a3b8]">
              上傳模特照和衣服照片，讓 AI 為你生成擬真穿搭合成圖。支援上身和下身衣物分別搭配，輕鬆預覽穿搭效果。
            </p>
            <a
              href="/login"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-8 py-3 text-sm font-medium text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:shadow-[#6366f1]/40 hover:brightness-110"
            >
              立即開始
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-80 w-80 rounded-full bg-[#6366f1]/5 blur-3xl" />
        <div className="absolute -right-40 top-3/4 h-80 w-80 rounded-full bg-[#8b5cf6]/5 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Quota display */}
        {user && (
          <div className="flex justify-end">
            <QuotaDisplay />
          </div>
        )}

        {/* Main content: two-column on desktop */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: Upload + Prompt + Submit */}
          <div className="flex flex-col gap-6">
            <div className="glass-card p-6">
              <h2 className="mb-5 text-lg font-semibold text-[#e2e8f0]">
                建立虛擬試穿任務
              </h2>

              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ImageUpload
                    label="模特全身照"
                    placeholder="上傳模特照片"
                    hint="全身正面照效果最佳"
                    onImageSelect={setModelImage}
                    selectedFile={modelImage}
                    disabled={isProcessing}
                  />
                  <ImageUpload
                    label="上身衣服"
                    placeholder="上傳上衣照片"
                    hint="襯衫、T-shirt、外套等"
                    onImageSelect={setTopImage}
                    selectedFile={topImage}
                    disabled={isProcessing}
                  />
                  <ImageUpload
                    label="下身衣服"
                    placeholder="上傳下身照片"
                    hint="褲子、裙子、短褲等"
                    onImageSelect={setBottomImage}
                    selectedFile={bottomImage}
                    disabled={isProcessing}
                  />
                </div>

                <PromptInput
                  value={prompt}
                  onChange={setPrompt}
                  disabled={isProcessing}
                />

                {/* Submit error */}
                {submitError && (
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
                    {submitError}
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] py-3 text-sm font-medium text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:shadow-[#6366f1]/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-5 w-5"
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
                      開始生成
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right column: Progress + Result */}
          <div className="flex flex-col gap-6">
            {/* Progress bar */}
            {jobId && (
              <div className="glass-card p-6">
                <h3 className="mb-4 text-sm font-medium text-[#e2e8f0]">
                  處理進度
                </h3>
                <ProgressBar
                  jobId={jobId}
                  onComplete={handleComplete}
                  onError={handleError}
                />
              </div>
            )}

            {/* Result viewer */}
            {completedJobId && (
              <ResultViewer jobId={completedJobId} onReset={handleReset} />
            )}

            {/* Placeholder when idle */}
            {!jobId && !completedJobId && (
              <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6366f1]/10">
                  <svg
                    className="h-8 w-8 text-[#6366f1]/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-[#64748b]">
                  上傳模特照和衣服照片後，<br />
                  結果將會顯示在這裡
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History section */}
        <div className="mt-4">
          <HistoryList onSelectJob={handleSelectJob} />
        </div>
      </main>
    </div>
  );
}

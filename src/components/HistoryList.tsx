'use client';

import { useEffect, useState, useCallback } from 'react';

interface HistoryListProps {
  onSelectJob: (jobId: string) => void;
}

interface Job {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  QUEUED: { label: '排隊中', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  PROCESSING: { label: '處理中', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  COMPLETED: { label: '已完成', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  FAILED: { label: '失敗', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

function truncatePrompt(prompt: string, maxLen = 40): string {
  const chars = [...prompt];
  if (chars.length <= maxLen) return prompt;
  return chars.slice(0, maxLen).join('') + '...';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryList({ onSelectJob }: HistoryListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/jobs', { credentials: 'include' });
      if (!res.ok) throw new Error('無法載入歷史紀錄');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="mb-4 text-sm font-medium text-[#e2e8f0]">歷史紀錄</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-[#1e293b] shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <h3 className="mb-4 text-sm font-medium text-[#e2e8f0]">歷史紀錄</h3>
        <p className="text-sm text-[#ef4444]">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="mb-4 text-sm font-medium text-[#e2e8f0]">歷史紀錄</h3>
        <div className="flex flex-col items-center gap-2 py-8 text-[#64748b]">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-sm">尚無歷史紀錄</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-sm font-medium text-[#e2e8f0]">歷史紀錄</h3>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {/* Table header */}
        <div className="sticky top-0 grid grid-cols-[1fr_2fr_auto_auto] gap-4 border-b border-border bg-[#0f172a]/90 px-6 py-3 text-xs font-medium text-[#64748b] backdrop-blur">
          <span>時間</span>
          <span>指令</span>
          <span>狀態</span>
          <span>操作</span>
        </div>

        {/* Table body */}
        {jobs.map((job) => {
          const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.FAILED;
          return (
            <div
              key={job.id}
              className="grid grid-cols-[1fr_2fr_auto_auto] gap-4 border-b border-[#1e293b] px-6 py-3 text-sm transition-colors hover:bg-[#1e293b]/50"
            >
              <span className="text-[#94a3b8] text-xs self-center">
                {formatTime(job.createdAt)}
              </span>
              <span className="text-[#e2e8f0] truncate self-center" title={job.prompt}>
                {truncatePrompt(job.prompt)}
              </span>
              <span className="self-center">
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ color: config.color, backgroundColor: config.bg }}
                >
                  {config.label}
                </span>
              </span>
              <span className="self-center">
                {job.status === 'COMPLETED' ? (
                  <button
                    onClick={() => onSelectJob(job.id)}
                    className="rounded-md border border-border px-3 py-1 text-xs text-[#94a3b8] transition-all hover:border-[#6366f1]/50 hover:text-[#6366f1]"
                  >
                    查看
                  </button>
                ) : (
                  <span className="text-xs text-[#475569]">--</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

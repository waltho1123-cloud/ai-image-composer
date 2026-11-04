'use client';

import { useEffect, useRef, useState } from 'react';

interface ProgressBarProps {
  jobId: string | null;
  onComplete: (jobId: string) => void;
  onError: (error: string) => void;
}

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | null;

const STATUS_LABELS: Record<string, string> = {
  queued: '排隊中',
  processing: '處理中',
  completed: '完成',
  failed: '失敗',
};

const STATUS_COLORS: Record<string, string> = {
  queued: '#f59e0b',
  processing: '#6366f1',
  completed: '#22c55e',
  failed: '#ef4444',
};

const MAX_RETRIES = 3;

export default function ProgressBar({ jobId, onComplete, onError }: ProgressBarProps) {
  const [status, setStatus] = useState<JobStatus>(jobId ? 'queued' : null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);

  // jobId 改變時重設顯示狀態（排隊中、0%、無錯誤；沒有 jobId 則不顯示）。
  // 在 render 階段比對前一個 jobId 再調整 state，而不是在 effect 裡同步 setState。
  const [prevJobId, setPrevJobId] = useState(jobId);
  if (prevJobId !== jobId) {
    setPrevJobId(jobId);
    setStatus(jobId ? 'queued' : null);
    setProgress(0);
    setErrorMsg(null);
  }

  useEffect(() => {
    if (!jobId) return;

    // connect 只在這個 effect 用到，宣告在 effect 內：函式宣告可以在內部遞迴呼叫自己（重連），
    // 也不會有 useCallback 的 const 在初始化前就被自己參照的問題。
    function connect(id: string) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/v1/jobs/${id}/stream`);
      eventSourceRef.current = es;

      es.addEventListener('status', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setStatus(data.status);
          if (typeof data.progress === 'number') {
            setProgress(data.progress);
          }
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener('complete', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setStatus('completed');
          setProgress(100);
          es.close();
          onComplete(data.jobId || id);
        } catch {
          setStatus('completed');
          setProgress(100);
          es.close();
          onComplete(id);
        }
      });

      es.addEventListener('error', (e: Event) => {
        // Check if it's a server-sent error event with data
        const msgEvent = e as MessageEvent;
        if (msgEvent.data) {
          try {
            const data = JSON.parse(msgEvent.data);
            setStatus('failed');
            setErrorMsg(data.message || '處理過程中發生錯誤');
            es.close();
            onError(data.message || '處理過程中發生錯誤');
            return;
          } catch {
            // fall through to reconnect
          }
        }

        // Connection error — attempt reconnect
        es.close();
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          setTimeout(() => connect(id), 2000 * retryCountRef.current);
        } else {
          setStatus('failed');
          const msg = '連線中斷，請重新整理頁面後再試';
          setErrorMsg(msg);
          onError(msg);
        }
      });
    }

    retryCountRef.current = 0;
    connect(jobId);

    return () => {
      eventSourceRef.current?.close();
    };
  }, [jobId, onComplete, onError]);

  if (!jobId || !status) return null;

  const color = STATUS_COLORS[status] || '#6366f1';

  return (
    <div className="w-full space-y-3">
      {/* Status label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'processing' && (
            <div className="h-2 w-2 rounded-full bg-[#6366f1] progress-pulse" />
          )}
          {status === 'queued' && (
            <div className="h-2 w-2 rounded-full bg-[#f59e0b] progress-pulse" />
          )}
          {status === 'completed' && (
            <svg className="h-4 w-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {status === 'failed' && (
            <svg className="h-4 w-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
          <span className="text-sm font-medium" style={{ color }}>
            {STATUS_LABELS[status] || status}
          </span>
        </div>
        <span className="text-xs text-[#64748b]">{Math.round(progress)}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e293b]">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          }}
        />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {errorMsg}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';

interface ResultViewerProps {
  jobId: string | null;
  onReset: () => void;
}

interface ResultData {
  jobId: string;
  mime: string;
  base64: string;
  expiresAt: string;
}

export default function ResultViewer({ jobId, onReset }: ResultViewerProps) {
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  const fetchResult = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/jobs/${id}/result`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || '無法載入結果');
      }
      const data: ResultData = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入結果');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (jobId) {
      fetchResult(jobId);
    } else {
      setResult(null);
      setError(null);
    }
  }, [jobId, fetchResult]);

  // Countdown timer for expiration
  useEffect(() => {
    if (!result?.expiresAt) {
      setCountdown('');
      return;
    }

    function updateCountdown() {
      const now = Date.now();
      const expires = new Date(result!.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setCountdown('已過期');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours} 小時 ${minutes} 分鐘後過期`);
      } else if (minutes > 0) {
        setCountdown(`${minutes} 分 ${seconds} 秒後過期`);
      } else {
        setCountdown(`${seconds} 秒後過期`);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [result]);

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = `data:${result.mime};base64,${result.base64}`;
    link.download = `ai-composed-${result.jobId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!jobId) return null;

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
          <p className="text-sm text-[#94a3b8]">載入結果中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <svg className="h-10 w-10 text-[#ef4444]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-[#ef4444]">{error}</p>
          <button
            onClick={onReset}
            className="rounded-lg border border-border px-4 py-2 text-sm text-[#94a3b8] transition-all hover:border-[#6366f1]/50 hover:text-white"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-sm font-medium text-[#e2e8f0]">合成結果</h3>
        {countdown && (
          <span
            className={`text-xs ${
              countdown === '已過期' ? 'text-[#ef4444]' : 'text-[#64748b]'
            }`}
          >
            {countdown}
          </span>
        )}
      </div>

      {/* Image */}
      <div className="flex items-center justify-center bg-[#0f172a]/50 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:${result.mime};base64,${result.base64}`}
          alt="合成結果"
          className="max-h-[500px] max-w-full rounded-lg object-contain"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-[#94a3b8] transition-all hover:border-[#6366f1]/50 hover:bg-[#6366f1]/10 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.182-3.182" />
          </svg>
          重新生成
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#6366f1]/25 transition-all hover:shadow-[#6366f1]/40 hover:brightness-110"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          下載 PNG
        </button>
      </div>
    </div>
  );
}

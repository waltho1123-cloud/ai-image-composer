'use client';

import { useEffect, useState } from 'react';

interface QuotaData {
  used: number;
  limit: number;
  remaining: number;
}

export default function QuotaDisplay() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuota();
  }, []);

  async function fetchQuota() {
    try {
      const res = await fetch('/api/v1/quota', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch quota');
      const data: QuotaData = await res.json();
      setQuota(data);
    } catch {
      setQuota(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
        <div className="h-4 w-16 rounded bg-[#1e293b] shimmer" />
      </div>
    );
  }

  if (!quota) return null;

  const percentage = (quota.used / quota.limit) * 100;
  const isExhausted = quota.remaining <= 0;
  const isLow = quota.remaining <= 3 && quota.remaining > 0;

  // SVG ring dimensions
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-2">
      {/* Ring progress */}
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(99,102,241,0.15)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isExhausted ? '#ef4444' : isLow ? '#f59e0b' : '#6366f1'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="flex flex-col">
        <span
          className={`text-xs font-medium ${
            isExhausted
              ? 'text-[#ef4444]'
              : isLow
                ? 'text-[#f59e0b]'
                : 'text-[#94a3b8]'
          }`}
        >
          {quota.used}/{quota.limit}
        </span>
        {isExhausted && (
          <span className="text-[10px] text-[#ef4444]">配額已用完</span>
        )}
      </div>
    </div>
  );
}

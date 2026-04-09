'use client';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const PROMPT_EXAMPLES = [
  '在戶外咖啡廳場景',
  '商務正式風格，辦公室背景',
  '休閒街拍風格，城市街道',
  '時尚雜誌封面風格',
];

const MAX_CHARS = 1000;

export default function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  // Use spread to handle multi-byte (CJK) characters correctly
  const charCount = [...value].length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-[#94a3b8]">
        輸入指令
      </label>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="額外指示：場景、風格、燈光等..."
          rows={4}
          className={`w-full resize-none rounded-xl border bg-[#1e293b]/50 px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#64748b] transition-all focus:outline-none focus:ring-2 ${
            disabled
              ? 'cursor-not-allowed border-[#334155] opacity-50'
              : isOverLimit
                ? 'border-[#ef4444]/50 focus:border-[#ef4444] focus:ring-[#ef4444]/20'
                : 'border-[#334155] focus:border-[#6366f1] focus:ring-[#6366f1]/20 hover:border-[#475569]'
          }`}
        />

        {/* Character count */}
        <div className="absolute bottom-3 right-3">
          <span
            className={`text-xs ${
              isOverLimit ? 'text-[#ef4444] font-medium' : 'text-[#64748b]'
            }`}
          >
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {isOverLimit && (
        <p className="mt-1 text-xs text-[#ef4444]">
          已超過字數上限，請縮減內容
        </p>
      )}

      {/* Example prompts */}
      <div className="mt-3">
        <p className="mb-2 text-xs text-[#64748b]">快速範例：</p>
        <div className="flex flex-wrap gap-2">
          {PROMPT_EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => onChange(example)}
              disabled={disabled}
              className="rounded-lg border border-[#334155] bg-[#1e293b]/30 px-3 py-1.5 text-xs text-[#94a3b8] transition-all hover:border-[#6366f1]/50 hover:bg-[#6366f1]/10 hover:text-[#e2e8f0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

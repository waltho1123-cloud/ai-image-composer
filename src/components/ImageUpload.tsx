'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  selectedFile?: File | null;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  hint?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageUpload({ onImageSelect, selectedFile, disabled, label, placeholder, hint }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile === null || selectedFile === undefined) {
      setPreview(null);
      setFileName(null);
      setFileSize(0);
      setError(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [selectedFile]);

  const validateAndSet = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('不支援的檔案格式，請上傳 JPG、PNG 或 WebP 圖片');
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError(`檔案過大 (${formatFileSize(file.size)})，上限為 10MB`);
        return;
      }

      setFileName(file.name);
      setFileSize(file.size);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      onImageSelect(file);
    },
    [onImageSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) validateAndSet(file);
    },
    [disabled, validateAndSet]
  );

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    setFileSize(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onImageSelect(null);
  };

  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-[#94a3b8]">
        {label ?? '上傳圖片'}
      </label>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
          disabled
            ? 'cursor-not-allowed border-[#334155] bg-[#0f172a]/50 opacity-50'
            : isDragging
              ? 'border-[#6366f1] bg-[#6366f1]/10'
              : preview
                ? 'border-[#6366f1]/30 bg-[#1e293b]/50'
                : 'border-[#334155] bg-[#1e293b]/30 hover:border-[#6366f1]/50 hover:bg-[#1e293b]/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {preview ? (
          <div className="relative flex w-full flex-col items-center p-4">
            <div className="relative overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="預覽圖片"
                className="max-h-[200px] max-w-full rounded-lg object-contain"
              />
              {!disabled && (
                <button
                  onClick={handleRemove}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-[#ef4444]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mt-3 flex w-full min-w-0 items-center gap-1.5 px-2 text-xs text-[#94a3b8]">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span className="min-w-0 truncate">{fileName}</span>
              <span className="shrink-0 text-[#64748b]">({formatFileSize(fileSize)})</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6366f1]/10">
              <svg
                className="h-7 w-7 text-[#6366f1]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#e2e8f0]">
                {placeholder ?? '拖拽圖片到此處，或'}
                <span className="text-[#6366f1]"> 點擊選擇檔案</span>
              </p>
              <p className="mt-1 text-xs text-[#64748b]">
                {hint ?? '支援 JPG、PNG、WebP，最大 10MB'}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

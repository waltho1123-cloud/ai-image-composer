export type ErrorCode =
  | 'ERR_INVALID_MIME'
  | 'ERR_FILE_TOO_LARGE'
  | 'ERR_PROMPT_TOO_LONG'
  | 'ERR_UNAUTHORIZED'
  | 'ERR_QUOTA_EXCEEDED'
  | 'ERR_RATE_LIMITED'
  | 'ERR_NOT_FOUND'
  | 'ERR_GONE'
  | 'ERR_GEMINI_BLOCKED'
  | 'ERR_GEMINI_API_ERROR'
  | 'ERR_NO_IMAGE_RETURNED'
  | 'ERR_WORKER_TIMEOUT'
  | 'ERR_CANCELLED'
  | 'ERR_INTERNAL'
  | 'ERR_OUTPUT_TOO_LARGE';

interface ErrorDef {
  status: number;
  message: string;
}

const ERROR_MAP: Record<ErrorCode, ErrorDef> = {
  ERR_INVALID_MIME: {
    status: 400,
    message: '請上傳 JPG、PNG 或 WebP 格式',
  },
  ERR_FILE_TOO_LARGE: {
    status: 400,
    message: '圖片大小不可超過 10MB',
  },
  ERR_PROMPT_TOO_LONG: {
    status: 400,
    message: '指令請控制在 1000 字以內',
  },
  ERR_UNAUTHORIZED: {
    status: 401,
    message: '請先登入',
  },
  ERR_QUOTA_EXCEEDED: {
    status: 429,
    message: '您今日的生成次數已用完，請明天再試',
  },
  ERR_RATE_LIMITED: {
    status: 429,
    message: '請求過於頻繁，請稍候再試',
  },
  ERR_NOT_FOUND: {
    status: 404,
    message: '找不到該任務',
  },
  ERR_GONE: {
    status: 410,
    message: '結果已過期（保留 1 小時），請重新生成',
  },
  ERR_GEMINI_BLOCKED: {
    status: 500,
    message: '圖片或指令含敏感內容，請調整後重試',
  },
  ERR_GEMINI_API_ERROR: {
    status: 500,
    message: 'AI 服務暫時無法回應，請稍後再試',
  },
  ERR_NO_IMAGE_RETURNED: {
    status: 500,
    message: 'AI 未產生圖片結果，請調整指令重試',
  },
  ERR_WORKER_TIMEOUT: {
    status: 500,
    message: '處理逾時，請重新生成',
  },
  ERR_CANCELLED: {
    status: 500,
    message: '任務已被取消',
  },
  ERR_INTERNAL: {
    status: 500,
    message: '系統發生錯誤，請聯繫管理員',
  },
  ERR_OUTPUT_TOO_LARGE: {
    status: 500,
    message: '輸出圖片過大',
  },
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;

  constructor(code: ErrorCode) {
    const def = ERROR_MAP[code];
    super(def.message);
    this.code = code;
    this.status = def.status;
    this.name = 'AppError';
  }
}

export function errorResponse(code: ErrorCode): Response {
  const def = ERROR_MAP[code];
  return Response.json(
    { error: { code, message: def.message } },
    { status: def.status },
  );
}

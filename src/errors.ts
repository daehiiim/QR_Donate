export type QrDonateErrorCode =
  | "QRDONATE_ENV_MISSING"
  | "QRDONATE_ACCOUNT_INVALID"
  | "QRDONATE_AMOUNT_INVALID"
  | "QRDONATE_TEMPLATE_INVALID"
  | "QRDONATE_QR_RENDER_FAILED"
  | "QRDONATE_METHOD_NOT_ALLOWED"
  | "QRDONATE_HTTP_FAILED";

export type QrDonateErrorDiagnostic = Record<string, unknown>;

export type QrDonateErrorOptions = {
  code: QrDonateErrorCode;
  status: number;
  safeMessage: string;
  developerMessage: string;
  diagnostic?: QrDonateErrorDiagnostic;
  upstreamErrorMessage?: string;
  cause?: unknown;
};

export type QrDonateLogContext = {
  input?: unknown;
  output?: unknown;
  upstream?: unknown;
};

export type QrDonatePublicError = {
  ok: false;
  code: QrDonateErrorCode;
  status: number;
  message: string;
};

/** QRDonate 도메인 오류를 표준 필드와 함께 전달한다. */
export class QrDonateError extends Error {
  readonly code: QrDonateErrorCode;
  readonly status: number;
  readonly safeMessage: string;
  readonly diagnostic: QrDonateErrorDiagnostic;
  readonly upstreamErrorMessage?: string;

  constructor(options: QrDonateErrorOptions) {
    super(options.developerMessage, { cause: options.cause });
    this.name = "QrDonateError";
    this.code = options.code;
    this.status = options.status;
    this.safeMessage = options.safeMessage;
    this.diagnostic = options.diagnostic ?? {};
    this.upstreamErrorMessage = options.upstreamErrorMessage;
  }
}

/** 알 수 없는 오류를 QRDonate 도메인 오류로 정규화한다. */
export function normalizeQrDonateError(error: unknown): QrDonateError {
  if (error instanceof QrDonateError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "알 수 없는 오류";

  return new QrDonateError({
    code: "QRDONATE_HTTP_FAILED",
    status: 500,
    safeMessage: "QR 후원 요청 처리 중 오류가 발생했습니다.",
    developerMessage: message,
    diagnostic: { originalType: typeof error },
    cause: error,
  });
}

/** 공개 응답에 포함할 수 있는 안전한 오류 본문을 만든다. */
export function toPublicErrorBody(error: QrDonateError): QrDonatePublicError {
  return {
    ok: false,
    code: error.code,
    status: error.status,
    message: `요청을 처리하지 못했습니다. / 에러 코드: ${error.code} / HTTP 상태: ${error.status} / 실패 위치: QRDonate / 원인: ${error.safeMessage} / 확인할 값: QRDonate env와 요청 amount / 다음 조치: 설정값을 확인한 뒤 다시 시도하세요.`,
  };
}

/** 내부 로그에 남기기 전 민감할 수 있는 계좌/URL 값을 축약한다. */
export function sanitizeForLog(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeForLog(item)]),
    );
  }

  return value;
}

/** 구조화 오류 로그를 stdout에 단일 JSON 라인으로 출력한다. */
export function writeQrDonateErrorLog(
  error: QrDonateError,
  context: QrDonateLogContext = {},
): void {
  const record = {
    event: "QRDONATE_ERROR_DIAGNOSTIC",
    code: error.code,
    status: error.status,
    input: sanitizeForLog(context.input ?? {}),
    output: sanitizeForLog(context.output ?? {}),
    errormessage: sanitizeString(error.message),
    error_message: sanitizeString(error.message),
    stacktrace: sanitizeString(error.stack ?? ""),
    diagnostic: sanitizeForLog(error.diagnostic),
    exception: sanitizeString(error.name),
    upstream: sanitizeForLog({
      ...(context.upstream && typeof context.upstream === "object"
        ? context.upstream
        : { value: context.upstream }),
      error_message: error.upstreamErrorMessage,
    }),
  };

  try {
    process.stdout.write(`QRDONATE_ERROR_DIAGNOSTIC ${JSON.stringify(record)}\n`);
  } catch {
    process.stdout.write(
      `QRDONATE_ERROR_DIAGNOSTIC {"code":"${error.code}","status":${error.status},"error_message":"log serialization failed"}\n`,
    );
  }
}

/** 긴 문자열과 계좌처럼 보이는 숫자열을 로그용으로 마스킹한다. */
function sanitizeString(value: string): string {
  const withoutLongDigits = value.replace(/\d{4,}/g, (match) => {
    if (match.length <= 8) {
      return `${match.slice(0, 2)}****${match.slice(-2)}`;
    }

    return `${match.slice(0, 4)}****${match.slice(-4)}`;
  });

  if (withoutLongDigits.length <= 500) {
    return withoutLongDigits;
  }

  return `${withoutLongDigits.slice(0, 500)}...`;
}

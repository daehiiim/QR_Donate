import { QrDonateError } from "./errors.js";

export type EnvSource = Record<string, string | undefined>;

export type TossUrlParts = {
  a: string;
  b: string;
  c: string;
};

const DEFAULT_TOSS_URL_TEMPLATE =
  "supertoss://send?amount={amount}&bank={bank}&accountNo={account}&origin=qr";

export type QrDonateConfig = {
  bankName: string;
  accountNumber: string;
  accountDisplay: string;
  accountHolder: string;
  defaultAmount: number;
  qrSize: number;
  title: string;
  description: string;
  thanksText: string;
  fallbackNotice: string;
  accentColor: string;
  encodeValues: boolean;
  qrImageUrl?: string;
  mascotImageUrl?: string;
  qrLink?: string;
  tossUrlTemplate?: string;
  tossUrlParts?: TossUrlParts;
};

export type QrDonatePublicConfig = {
  bankName: string;
  accountDisplay: string;
  accountMasked: string;
  accountHolder: string;
  defaultAmount: number;
  qrSize: number;
  title: string;
  description: string;
  thanksText: string;
  fallbackNotice: string;
  qrImageUrl?: string;
  mascotImageUrl?: string;
};

/** env 값을 읽어 QR 후원 기능의 단일 설정 객체를 만든다. */
export function buildDonationConfigFromEnv(
  env: EnvSource = process.env,
): QrDonateConfig {
  const bankName = readRequiredEnv(env, "QRDONATE_BANK_NAME");
  const rawAccount = readRequiredEnv(env, "QRDONATE_ACCOUNT_NUMBER");
  const accountNumber = normalizeAccountNumber(rawAccount);
  const configuredTossUrlTemplate = readOptionalEnv(
    env,
    "QRDONATE_TOSS_URL_TEMPLATE",
  );
  const tossUrlParts = readTossUrlParts(env);
  const tossUrlTemplate =
    configuredTossUrlTemplate ??
    (tossUrlParts ? undefined : DEFAULT_TOSS_URL_TEMPLATE);

  if (tossUrlTemplate) {
    assertTemplate(tossUrlTemplate);
  }

  return {
    bankName,
    accountNumber,
    accountDisplay: rawAccount.trim(),
    accountHolder: readOptionalEnv(env, "QRDONATE_ACCOUNT_HOLDER") ?? "",
    defaultAmount: parseAmount(
      readOptionalEnv(env, "QRDONATE_DEFAULT_AMOUNT") ?? "0",
    ),
    qrSize: parseQrSize(readOptionalEnv(env, "QRDONATE_QR_SIZE") ?? "240"),
    title:
      readOptionalEnv(env, "QRDONATE_TITLE") ??
      "개발자한테 커피 한 잔 쏘기!",
    description:
      readOptionalEnv(env, "QRDONATE_DESCRIPTION") ??
      "작은 응원이 개발자에게는 큰 힘이 됩니다!!",
    thanksText: readOptionalEnv(env, "QRDONATE_THANKS_TEXT") ?? "",
    fallbackNotice:
      readOptionalEnv(env, "QRDONATE_FALLBACK_NOTICE") ??
      "QR 인식이 안되면 아래 계좌 번호로 부탁드립니다!",
    accentColor: readOptionalEnv(env, "QRDONATE_ACCENT_COLOR") ?? "#0064ff",
    encodeValues: readOptionalEnv(env, "QRDONATE_ENCODE_VALUES") !== "false",
    qrImageUrl: readOptionalEnv(env, "QRDONATE_QR_IMAGE_URL"),
    mascotImageUrl: readOptionalEnv(env, "QRDONATE_MASCOT_IMAGE_URL"),
    qrLink: readOptionalEnv(env, "QRDONATE_QR_LINK"),
    tossUrlTemplate,
    tossUrlParts,
  };
}

/** 공개 API에서 반환해도 되는 설정값만 추려낸다. */
export function toPublicConfig(config: QrDonateConfig): QrDonatePublicConfig {
  return {
    bankName: config.bankName,
    accountDisplay: config.accountDisplay,
    accountMasked: maskAccountNumber(config.accountNumber),
    accountHolder: config.accountHolder,
    defaultAmount: config.defaultAmount,
    qrSize: config.qrSize,
    title: config.title,
    description: config.description,
    thanksText: config.thanksText,
    fallbackNotice: config.fallbackNotice,
    qrImageUrl: config.qrImageUrl,
    mascotImageUrl: config.mascotImageUrl,
  };
}

/** 계좌번호를 표시 또는 로그에 쓸 수 있도록 가운데 숫자를 가린다. */
export function maskAccountNumber(accountNumber: string): string {
  const normalized = normalizeAccountNumber(accountNumber);

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}****${normalized.slice(-2)}`;
  }

  return `${normalized.slice(0, 4)}-****-${normalized.slice(-4)}`;
}

/** 금액 입력을 0 이상의 정수 원 단위로 정규화한다. */
export function parseAmount(value: string | number | undefined): number {
  const amount =
    typeof value === "number" ? value : Number.parseInt(String(value ?? "0"), 10);

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw new QrDonateError({
      code: "QRDONATE_AMOUNT_INVALID",
      status: 400,
      safeMessage: "송금 금액은 0 이상의 정수여야 합니다.",
      developerMessage: `Invalid amount: ${String(value)}`,
      diagnostic: { value },
    });
  }

  return amount;
}

/** 필수 env 값을 공백 제거 후 반환한다. */
function readRequiredEnv(env: EnvSource, key: string): string {
  const value = readOptionalEnv(env, key);

  if (!value) {
    throw new QrDonateError({
      code: "QRDONATE_ENV_MISSING",
      status: 500,
      safeMessage: `${key} 설정이 없습니다.`,
      developerMessage: `Missing required env: ${key}`,
      diagnostic: { key },
    });
  }

  return value;
}

/** 선택 env 값을 공백 제거 후 반환한다. */
function readOptionalEnv(env: EnvSource, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

/** 계좌번호에서 숫자만 남기고 최소 길이를 검증한다. */
function normalizeAccountNumber(value: string): string {
  const accountNumber = value.replace(/\D/g, "");

  if (accountNumber.length < 10 || accountNumber.length > 20) {
    throw new QrDonateError({
      code: "QRDONATE_ACCOUNT_INVALID",
      status: 500,
      safeMessage: "계좌번호 형식이 올바르지 않습니다.",
      developerMessage:
        "QRDONATE_ACCOUNT_NUMBER must contain 10 to 20 digits after normalization.",
      diagnostic: { digitLength: accountNumber.length },
    });
  }

  return accountNumber;
}

/** QR 이미지 크기 env를 접근성 있는 범위로 제한한다. */
function parseQrSize(value: string): number {
  const size = Number.parseInt(value, 10);

  if (!Number.isFinite(size) || size < 128 || size > 640) {
    return 240;
  }

  return size;
}

/** coffee-hanzan 방식의 A/B/C URL 조각을 읽는다. */
function readTossUrlParts(env: EnvSource): TossUrlParts | undefined {
  const a = readOptionalEnv(env, "QRDONATE_TOSS_URL_A");
  const b = readOptionalEnv(env, "QRDONATE_TOSS_URL_B");
  const c = readOptionalEnv(env, "QRDONATE_TOSS_URL_C");

  if (!a && !b && !c) {
    return undefined;
  }

  if (!a || !b || !c) {
    throw new QrDonateError({
      code: "QRDONATE_ENV_MISSING",
      status: 500,
      safeMessage: "토스 송금 QR payload 조각 env가 불완전합니다.",
      developerMessage:
        "QRDONATE_TOSS_URL_A, QRDONATE_TOSS_URL_B, QRDONATE_TOSS_URL_C must be set together.",
      diagnostic: { hasA: Boolean(a), hasB: Boolean(b), hasC: Boolean(c) },
    });
  }

  return { a, b, c };
}

/** URL 템플릿에 필수 placeholder가 포함됐는지 검증한다. */
function assertTemplate(template: string): void {
  if (!template.includes("{bank}") || !template.includes("{account}")) {
    throw new QrDonateError({
      code: "QRDONATE_TEMPLATE_INVALID",
      status: 500,
      safeMessage: "토스 송금 QR payload 템플릿이 올바르지 않습니다.",
      developerMessage:
        "QRDONATE_TOSS_URL_TEMPLATE must include {bank} and {account}.",
      diagnostic: { template },
    });
  }
}

import { parseAmount, type QrDonateConfig } from "./config.js";

export type TossTransferPayloadOptions = {
  amount?: number | string;
};

/** 직접 입력한 QR 링크가 있으면 우선 사용하고, 없으면 env 템플릿으로 송금 링크를 만든다. */
export function resolveTossTransferUrl(
  config: QrDonateConfig,
  options: TossTransferPayloadOptions = {},
): string {
  return config.qrLink ?? buildTossTransferPayload(config, options);
}

/** 설정과 요청 금액을 조합해 QR에 담을 토스 송금 payload를 만든다. */
export function buildTossTransferPayload(
  config: QrDonateConfig,
  options: TossTransferPayloadOptions = {},
): string {
  const amount = parseAmount(options.amount ?? config.defaultAmount);
  const values = buildTemplateValues(config, amount);

  if (config.tossUrlTemplate) {
    return replaceTemplate(config.tossUrlTemplate, values);
  }

  if (config.tossUrlParts) {
    return `${config.tossUrlParts.a}${values.bank}${config.tossUrlParts.b}${values.account}${config.tossUrlParts.c}${values.amount}`;
  }

  return "";
}

type TemplateValues = {
  bank: string;
  bankRaw: string;
  account: string;
  accountDisplay: string;
  amount: string;
  holder: string;
};

/** URL 템플릿 치환에 사용할 값을 준비한다. */
function buildTemplateValues(
  config: QrDonateConfig,
  amount: number,
): TemplateValues {
  return {
    bank: encodeValue(config.bankName, config.encodeValues),
    bankRaw: config.bankName,
    account: config.accountNumber,
    accountDisplay: encodeValue(config.accountDisplay, config.encodeValues),
    amount: String(amount),
    holder: encodeValue(config.accountHolder, config.encodeValues),
  };
}

/** `{key}` placeholder를 실제 송금 값으로 치환한다. */
function replaceTemplate(
  template: string,
  values: TemplateValues,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

/** 설정에 따라 URL 값 인코딩 여부를 결정한다. */
function encodeValue(value: string, shouldEncode: boolean): string {
  return shouldEncode ? encodeURIComponent(value) : value;
}

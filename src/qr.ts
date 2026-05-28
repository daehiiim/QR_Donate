import QRCode from "qrcode";

import { QrDonateError } from "./errors.js";
import { buildTossTransferPayload, type TossTransferPayloadOptions } from "./payload.js";
import type { QrDonateConfig } from "./config.js";

export type RenderQrSvgOptions = TossTransferPayloadOptions;

/** 토스 송금 payload를 QR SVG 문자열로 렌더링한다. */
export async function renderQrSvg(
  config: QrDonateConfig,
  options: RenderQrSvgOptions = {},
): Promise<string> {
  const payload = buildTossTransferPayload(config, options);

  try {
    return await QRCode.toString(payload, {
      type: "svg",
      width: config.qrSize,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    });
  } catch (error) {
    throw new QrDonateError({
      code: "QRDONATE_QR_RENDER_FAILED",
      status: 500,
      safeMessage: "QR 이미지를 만들지 못했습니다.",
      developerMessage:
        error instanceof Error ? error.message : "qrcode render failed",
      diagnostic: { payloadLength: payload.length },
      cause: error,
    });
  }
}

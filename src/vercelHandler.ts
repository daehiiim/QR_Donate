import {
  buildDonationConfigFromEnv,
  parseAmount,
  toPublicConfig,
  type EnvSource,
} from "./config.js";
import {
  normalizeQrDonateError,
  QrDonateError,
  toPublicErrorBody,
  writeQrDonateErrorLog,
} from "./errors.js";
import { renderDonationPageHtml, renderEmbedScript } from "./page.js";
import { resolveTossTransferUrl } from "./payload.js";
import { renderQrSvg } from "./qr.js";

export type QrDonateVercelRoute =
  | "config"
  | "payload"
  | "page"
  | "svg"
  | "widget";

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "access-control-allow-origin": "*",
};

/** Vercel Function 요청을 QRDonate API 응답으로 변환한다. */
export async function handleQrDonateVercelRequest(
  request: Request,
  route: QrDonateVercelRoute,
  env: EnvSource = process.env,
): Promise<Response> {
  const url = new URL(request.url);

  try {
    if (request.method !== "GET") {
      throw new QrDonateError({
        code: "QRDONATE_METHOD_NOT_ALLOWED",
        status: 405,
        safeMessage: "GET 요청만 지원합니다.",
        developerMessage: `Unsupported method: ${request.method}`,
        diagnostic: { method: request.method, route },
      });
    }

    return await routeVercelRequest(request, route, env, url);
  } catch (error) {
    const normalized = normalizeQrDonateError(error);
    writeQrDonateErrorLog(normalized, {
      input: {
        method: request.method,
        url: url.pathname,
        route,
        query: Object.fromEntries(url.searchParams.entries()),
      },
      output: { status: normalized.status },
    });

    return errorResponse(request, normalized);
  }
}

/** route 이름에 따라 QRDonate 화면, JSON, SVG, widget 응답을 만든다. */
async function routeVercelRequest(
  request: Request,
  route: QrDonateVercelRoute,
  env: EnvSource,
  url: URL,
): Promise<Response> {
  const config = buildDonationConfigFromEnv(env);
  const amount = parseAmount(url.searchParams.get("amount") ?? config.defaultAmount);

  if (route === "config") {
    return jsonResponse({ ok: true, config: toPublicConfig(config) });
  }

  if (route === "payload") {
    return jsonResponse({
      ok: true,
      amount,
      transferUrl: resolveTossTransferUrl(config, { amount }),
      config: toPublicConfig(config),
    });
  }

  if (route === "svg") {
    return textResponse(
      await renderQrSvg(config, { amount }),
      "image/svg+xml; charset=utf-8",
    );
  }

  if (route === "widget") {
    return textResponse(
      renderEmbedScript(new URL(request.url).origin),
      "application/javascript; charset=utf-8",
    );
  }

  const qrSvg = await renderQrSvg(config, { amount });
  return textResponse(
    renderDonationPageHtml(config, {
      qrSvg,
      amount,
      embedded: url.searchParams.get("embedded") === "1",
    }),
    "text/html; charset=utf-8",
  );
}

/** JSON 응답에 공통 보안 header를 붙인다. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

/** 문자열 응답에 공통 보안 header를 붙인다. */
function textResponse(body: string, contentType: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      "content-type": contentType,
    },
  });
}

/** 요청 accept 형식에 맞춰 안전한 공개 오류 응답을 만든다. */
function errorResponse(request: Request, error: QrDonateError): Response {
  const publicBody = toPublicErrorBody(error);
  const acceptsHtml = request.headers.get("accept")?.includes("text/html");

  if (acceptsHtml) {
    return textResponse(`<p>${publicBody.message}</p>`, "text/html; charset=utf-8", error.status);
  }

  return jsonResponse(publicBody, error.status);
}

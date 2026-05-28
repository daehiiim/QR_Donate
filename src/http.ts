import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";

import { parseAmount, toPublicConfig, type QrDonateConfig } from "./config.js";
import {
  normalizeQrDonateError,
  toPublicErrorBody,
  writeQrDonateErrorLog,
} from "./errors.js";
import { renderEmbedScript, renderDonationPageHtml } from "./page.js";
import { resolveTossTransferUrl } from "./payload.js";
import { renderQrSvg } from "./qr.js";

const ASSET_CONTENT_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
]);

export type QrDonateRequestHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>;

/** QRDonate HTTP 요청 handler를 생성한다. */
export function createQrDonateRequestHandler(
  config: QrDonateConfig,
): QrDonateRequestHandler {
  return async (request, response) => {
    const url = buildRequestUrl(request);

    try {
      await routeRequest(config, request, response, url);
    } catch (error) {
      const normalized = normalizeQrDonateError(error);
      writeQrDonateErrorLog(normalized, {
        input: {
          method: request.method,
          url: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
        },
        output: { status: normalized.status },
      });
      sendError(response, request, normalized);
    }
  };
}

/** QRDonate만 독립 실행할 수 있는 Node HTTP 서버를 만든다. */
export function createQrDonateServer(config: QrDonateConfig): Server {
  return createServer((request, response) => {
    void createQrDonateRequestHandler(config)(request, response);
  });
}

/** URL path에 맞는 API 또는 화면 응답을 선택한다. */
async function routeRequest(
  config: QrDonateConfig,
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<void> {
  const amount = parseAmount(url.searchParams.get("amount") ?? config.defaultAmount);

  if (request.method !== "GET") {
    sendJson(response, 405, { ok: false, message: "GET method only" });
    return;
  }

  if (url.pathname === "/" || url.pathname === "/donate" || url.pathname === "/api/qr-donate/page") {
    const qrSvg = await renderQrSvg(config, { amount });
    sendHtml(
      response,
      renderDonationPageHtml(config, {
        qrSvg,
        amount,
        embedded: url.searchParams.get("embedded") === "1",
      }),
    );
    return;
  }

  if (url.pathname === "/api/qr-donate/config") {
    sendJson(response, 200, { ok: true, config: toPublicConfig(config) });
    return;
  }

  if (url.pathname === "/api/qr-donate/payload") {
    sendJson(response, 200, {
      ok: true,
      amount,
      transferUrl: resolveTossTransferUrl(config, { amount }),
      config: toPublicConfig(config),
    });
    return;
  }

  if (url.pathname === "/api/qr-donate/svg") {
    sendText(response, 200, "image/svg+xml; charset=utf-8", await renderQrSvg(config, { amount }));
    return;
  }

  if (url.pathname === "/api/qr-donate/widget.js") {
    sendText(response, 200, "application/javascript; charset=utf-8", renderEmbedScript(getBaseUrl(request)));
    return;
  }

  const asset = await readStaticAsset(url.pathname);
  if (asset) {
    sendBuffer(response, 200, asset.contentType, asset.body);
    return;
  }

  sendJson(response, 404, { ok: false, message: "QRDonate route not found" });
}

/** 요청 객체에서 안전하게 URL 객체를 만든다. */
function buildRequestUrl(request: IncomingMessage): URL {
  return new URL(request.url ?? "/", getBaseUrl(request));
}

/** 요청 host와 protocol을 기준으로 외부 접근 기준 URL을 만든다. */
function getBaseUrl(request: IncomingMessage): string {
  const protocol = request.headers["x-forwarded-proto"] ?? "http";
  const host = request.headers.host ?? "localhost";
  return `${Array.isArray(protocol) ? protocol[0] : protocol}://${host}`;
}

/** assets 폴더 안의 단일 이미지 파일만 안전하게 읽는다. */
async function readStaticAsset(
  pathname: string,
): Promise<{ contentType: string; body: Buffer } | undefined> {
  if (!pathname.startsWith("/assets/")) {
    return undefined;
  }

  const fileName = decodeURIComponent(pathname.replace("/assets/", ""));

  if (
    !fileName ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..")
  ) {
    return undefined;
  }

  const contentType = ASSET_CONTENT_TYPES.get(
    path.extname(fileName).toLowerCase(),
  );

  if (!contentType) {
    return undefined;
  }

  try {
    return {
      contentType,
      body: await readFile(path.join(process.cwd(), "assets", fileName)),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

/** JSON 응답을 공통 header와 함께 전송한다. */
function sendJson(response: ServerResponse, status: number, body: unknown): void {
  sendText(
    response,
    status,
    "application/json; charset=utf-8",
    JSON.stringify(body),
  );
}

/** HTML 응답을 공통 header와 함께 전송한다. */
function sendHtml(response: ServerResponse, html: string): void {
  sendText(response, 200, "text/html; charset=utf-8", html);
}

/** 문자열 응답을 공통 header와 함께 전송한다. */
function sendText(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: string,
): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": "*",
  });
  response.end(body);
}

/** 바이너리 응답을 공통 header와 함께 전송한다. */
function sendBuffer(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: Buffer,
): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": "*",
  });
  response.end(body);
}

/** 요청 형식에 맞춰 안전한 오류 응답을 전송한다. */
function sendError(
  response: ServerResponse,
  request: IncomingMessage,
  error: ReturnType<typeof normalizeQrDonateError>,
): void {
  const publicBody = toPublicErrorBody(error);
  const acceptsHtml = request.headers.accept?.includes("text/html");

  if (acceptsHtml) {
    sendText(
      response,
      error.status,
      "text/html; charset=utf-8",
      `<p>${publicBody.message}</p>`,
    );
    return;
  }

  sendJson(response, error.status, publicBody);
}

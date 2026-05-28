import type { QrDonateConfig } from "./config.js";
import { resolveTossTransferUrl } from "./payload.js";

export type DonationPageOptions = {
  qrSvg: string;
  amount?: number | string;
  embedded?: boolean;
};

/** QR SVG와 계좌 정보를 포함한 독립 후원 화면 HTML을 만든다. */
export function renderDonationPageHtml(
  config: QrDonateConfig,
  options: DonationPageOptions,
): string {
  const pageQrSize = Math.min(config.qrSize, 292);
  const transferUrl =
    resolveTossTransferUrl(config, {
      amount: options.amount ?? config.defaultAmount,
    });
  const qrContent = config.qrImageUrl
    ? `<img class="qrImage" src="${escapeAttribute(config.qrImageUrl)}" alt="토스 송금 QR 코드" />`
    : `<div data-qr-fallback="svg">${options.qrSvg}</div>`;
  const mascotContent = config.mascotImageUrl
    ? `<img class="mascotImage" src="${escapeAttribute(config.mascotImageUrl)}" alt="" />`
    : "";
  const thanksTextContent = config.thanksText
    ? `<p class="thanksText">${escapeHtml(config.thanksText)}</p>`
    : "";
  const thanksRow = mascotContent || thanksTextContent
    ? `<div class="thanksRow">
          ${mascotContent}
          ${thanksTextContent}
        </div>`
    : "";
  const holderLabel = config.accountHolder
    ? `<span>${escapeHtml(config.accountHolder)}</span>`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(config.title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" />
  <style>
    :root {
      color-scheme: light;
      --accent: ${escapeHtml(config.accentColor)};
      --text: #191f28;
      --muted: #6b7684;
      --line: #e5e8eb;
      --surface: #ffffff;
      --page: #f6f9fc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: ${options.embedded ? "auto" : "100vh"};
      display: grid;
      place-items: center;
      background: var(--page);
      color: var(--text);
      font-family: Pretendard, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    main {
      width: min(100%, 536px);
      padding: ${options.embedded ? "14px" : "24px"};
    }
    .donatePanel {
      display: grid;
      gap: 20px;
      padding: 32px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: 0 12px 32px rgba(2, 32, 71, 0.06);
    }
    .header {
      display: grid;
      gap: 16px;
      text-align: center;
    }
    .title {
      margin: 0;
      font-size: 30px;
      line-height: 1.25;
      font-weight: 800;
    }
    .thanksText {
      margin: 0;
      color: var(--text);
      font-size: 18px;
      line-height: 1.35;
      font-weight: 800;
    }
    .thanksRow {
      display: grid;
      place-items: center;
      min-height: 132px;
    }
    .mascotImage {
      display: block;
      width: auto;
      max-width: min(100%, 240px);
      max-height: 132px;
      height: auto;
      object-fit: contain;
    }
    .description {
      margin: 0;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.55;
      font-weight: 400;
    }
    .qrFrame {
      display: grid;
      place-items: center;
      justify-self: center;
      width: min(100%, 326px);
      min-height: 0;
      padding: 7px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
    }
    .qrFrame svg,
    .qrImage {
      display: block;
      justify-self: center;
      align-self: center;
      margin: auto;
      width: min(100%, ${pageQrSize}px);
      height: auto;
    }
    .accountBox {
      display: grid;
      gap: 8px;
      padding: 14px 20px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f9fafb;
      font-size: 18px;
    }
    .accountMeta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
    }
    .accountNumber {
      font-size: 26px;
      line-height: 1.3;
      font-weight: 800;
      word-break: break-all;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    button,
    a.button {
      height: 58px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
      color: var(--text);
      font: inherit;
      font-size: 19px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
    }
    a.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #ffffff;
    }
    .actions .desktopOnly {
      display: inline-flex;
    }
    .actions .mobileOnly {
      display: none;
    }
    body[data-device="mobile"] .actions .desktopOnly {
      display: none;
    }
    body[data-device="mobile"] .actions .mobileOnly {
      display: inline-flex;
    }
    .fallbackNotice {
      margin: 0;
      text-align: center;
      color: var(--muted);
      font-size: 17px;
      line-height: 1.55;
    }
    @media (max-width: 640px) {
      main { padding: 12px; }
      .donatePanel {
        gap: 16px;
        padding: 20px 16px;
      }
      .title { font-size: 24px; }
      .thanksRow {
        min-height: 116px;
      }
      .mascotImage {
        max-width: min(100%, 214px);
        max-height: 116px;
      }
      .thanksText { font-size: 16px; }
      .description { font-size: 16px; }
      .qrFrame { padding: 6px; }
      .accountBox { padding: 16px; font-size: 16px; }
      .accountNumber { font-size: 22px; }
      button,
      a.button {
        height: 50px;
        font-size: 17px;
      }
    }
  </style>
</head>
<body data-device="desktop">
  <main>
    <section class="donatePanel" aria-label="토스 QR 송금">
      <header class="header">
        <h1 class="title">${escapeHtml(config.title)}</h1>
        ${thanksRow}
        <p class="description">${escapeHtml(config.description)}</p>
      </header>
      <div class="qrFrame" aria-label="토스 송금 QR 코드">
        ${qrContent}
      </div>
      <p class="fallbackNotice">${escapeHtml(config.fallbackNotice)}</p>
      <div class="accountBox">
        <div class="accountMeta">
          <span>${escapeHtml(config.bankName)}</span>
          ${holderLabel}
        </div>
        <div class="accountNumber" id="accountNumber">${escapeHtml(config.accountDisplay)}</div>
      </div>
      <div class="actions">
        <button class="desktopOnly" type="button" id="copyAccount">계좌 복사</button>
        <a class="button primary mobileOnly" id="openToss" href="${escapeAttribute(transferUrl)}">토스 열기</a>
      </div>
    </section>
  </main>
  <script>
    const isMobileRuntime = () => {
      const userAgent = navigator.userAgent || "";
      const hasMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const hasMobileClientHint = navigator.userAgentData?.mobile === true;
      const hasTouchSmallViewport = navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 768px)").matches;
      return hasMobileClientHint || hasMobileUserAgent || hasTouchSmallViewport;
    };

    document.body.dataset.device = isMobileRuntime() ? "mobile" : "desktop";

    const copyButton = document.getElementById("copyAccount");
    const accountNumber = document.getElementById("accountNumber");
    const copyAccountText = async (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // 브라우저 권한이 막히면 아래 legacy 복사 경로로 내려간다.
        }
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        return document.execCommand("copy");
      } finally {
        textarea.remove();
      }
    };

    copyButton?.addEventListener("click", async () => {
      const text = accountNumber?.textContent?.trim() || "";
      if (!text) return;
      const copied = await copyAccountText(text);
      copyButton.textContent = copied ? "복사됨" : "복사 실패";
      window.setTimeout(() => { copyButton.textContent = "계좌 복사"; }, 1400);
    });
  </script>
</body>
</html>`;
}

/** 외부 사이트에 iframe 방식으로 붙일 수 있는 짧은 스크립트를 만든다. */
export function renderEmbedScript(baseUrl: string): string {
  const safeBaseUrl = JSON.stringify(baseUrl.replace(/\/$/, ""));

  return `(function () {
  var script = document.currentScript;
  var frame = document.createElement("iframe");
  frame.src = ${safeBaseUrl} + "/?embedded=1";
  frame.title = "QRDonate";
  frame.loading = "lazy";
  frame.style.width = "100%";
  frame.style.maxWidth = "420px";
  frame.style.height = "780px";
  frame.style.border = "0";
  frame.style.display = "block";
  (script && script.parentNode ? script.parentNode : document.body).insertBefore(frame, script ? script.nextSibling : null);
})();`;
}

/** HTML 본문에 들어갈 문자열을 이스케이프한다. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** HTML 속성에 들어갈 문자열을 이스케이프한다. */
function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

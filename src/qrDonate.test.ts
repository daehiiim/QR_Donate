import { strict as assert } from "node:assert";
import test from "node:test";

import {
  QrDonateError,
  buildDonationConfigFromEnv,
  buildTossTransferPayload,
  handleQrDonateVercelRequest,
  maskAccountNumber,
  renderDonationPageHtml,
  renderQrSvg,
  resolveTossTransferUrl,
  toPublicConfig,
} from "./index.js";

test("env 기반 설정으로 토스 송금 payload를 만든다", () => {
  const config = buildDonationConfigFromEnv({
    QRDONATE_BANK_NAME: "토스뱅크",
    QRDONATE_ACCOUNT_NUMBER: "1000-2000-3000",
    QRDONATE_ACCOUNT_HOLDER: "라노벨",
    QRDONATE_DEFAULT_AMOUNT: "5000",
    QRDONATE_TOSS_URL_TEMPLATE:
      "toss://transfer?bank={bank}&account={account}&amount={amount}",
  });

  const payload = buildTossTransferPayload(config, { amount: 7000 });

  assert.equal(
    payload,
    "toss://transfer?bank=%ED%86%A0%EC%8A%A4%EB%B1%85%ED%81%AC&account=100020003000&amount=7000",
  );
});

test("토스 앱에서 디코딩한 supertoss 송금 payload 템플릿을 만든다", () => {
  const config = buildDonationConfigFromEnv({
    QRDONATE_BANK_NAME: "토스뱅크",
    QRDONATE_ACCOUNT_NUMBER: "1000-2000-3000",
    QRDONATE_TOSS_URL_TEMPLATE:
      "supertoss://send?amount={amount}&bank={bank}&accountNo={account}&origin=qr",
  });

  const payload = buildTossTransferPayload(config, { amount: 0 });

  assert.equal(
    payload,
    "supertoss://send?amount=0&bank=%ED%86%A0%EC%8A%A4%EB%B1%85%ED%81%AC&accountNo=100020003000&origin=qr",
  );
});

test("직접 입력한 QR 링크가 있으면 화면과 API가 같은 링크를 우선 사용한다", () => {
  const config = buildDonationConfigFromEnv({
    QRDONATE_BANK_NAME: "토스뱅크",
    QRDONATE_ACCOUNT_NUMBER: "1000-2000-3000",
    QRDONATE_QR_LINK: "supertoss://send?amount=5000&accountNo=100020003000",
  });

  assert.equal(
    resolveTossTransferUrl(config, { amount: 9000 }),
    "supertoss://send?amount=5000&accountNo=100020003000",
  );
});

test("coffee-hanzan 방식의 A/B/C 조각 env도 지원한다", () => {
  const config = buildDonationConfigFromEnv({
    QRDONATE_BANK_NAME: "토스뱅크",
    QRDONATE_ACCOUNT_NUMBER: "1000-2000-3000",
    QRDONATE_TOSS_URL_A: "toss://transfer?bank=",
    QRDONATE_TOSS_URL_B: "&account=",
    QRDONATE_TOSS_URL_C: "&amount=",
  });

  const payload = buildTossTransferPayload(config, { amount: 3000 });

  assert.equal(
    payload,
    "toss://transfer?bank=%ED%86%A0%EC%8A%A4%EB%B1%85%ED%81%AC&account=100020003000&amount=3000",
  );
});

test("이미지 주소와 계좌 정보만 바꾸면 화면과 토스 링크가 함께 바뀐다", async () => {
  const config = buildDonationConfigFromEnv({
    QRDONATE_BANK_NAME: "카카오뱅크",
    QRDONATE_ACCOUNT_NUMBER: "3333-04-1234567",
    QRDONATE_ACCOUNT_HOLDER: "홍길순",
    QRDONATE_DEFAULT_AMOUNT: "9000",
    QRDONATE_QR_IMAGE_URL: "https://cdn.example.com/kakao-qr.webp",
  });

  const payload = buildTossTransferPayload(config);
  const svg = await renderQrSvg(config);
  const html = renderDonationPageHtml(config, { qrSvg: svg });
  const publicConfig = toPublicConfig(config);

  assert.equal(config.accountNumber, "3333041234567");
  assert.equal(publicConfig.bankName, "카카오뱅크");
  assert.equal(publicConfig.accountDisplay, "3333-04-1234567");
  assert.equal(publicConfig.accountHolder, "홍길순");
  assert.equal(publicConfig.qrImageUrl, "https://cdn.example.com/kakao-qr.webp");
  assert.match(
    payload,
    /^supertoss:\/\/send\?amount=9000&bank=%EC%B9%B4%EC%B9%B4%EC%98%A4%EB%B1%85%ED%81%AC&accountNo=3333041234567&origin=qr$/,
  );
  assert.match(html, /https:\/\/cdn\.example\.com\/kakao-qr\.webp/);
  assert.match(html, /카카오뱅크/);
  assert.match(html, /3333-04-1234567/);
  assert.match(html, /홍길순/);
});

test("계좌번호는 표시용으로 마스킹하고 원본 숫자는 보존한다", () => {
  const config = buildDonationConfigFromEnv({
    QRDONATE_BANK_NAME: "토스뱅크",
    QRDONATE_ACCOUNT_NUMBER: "1000-2000-3000",
    QRDONATE_TOSS_URL_TEMPLATE:
      "toss://transfer?bank={bank}&account={account}&amount={amount}",
  });

  assert.equal(config.accountNumber, "100020003000");
  assert.equal(config.accountDisplay, "1000-2000-3000");
  assert.equal(maskAccountNumber(config.accountNumber), "1000-****-3000");
});

test("필수 env가 없으면 도메인 에러 코드를 던진다", () => {
  assert.throws(
    () => buildDonationConfigFromEnv({ QRDONATE_ACCOUNT_NUMBER: "12345678901" }),
    (error) =>
      error instanceof QrDonateError &&
      error.code === "QRDONATE_ENV_MISSING",
  );
});

test("QR SVG와 후원 HTML 화면을 렌더링한다", async () => {
  const config = buildDonationConfigFromEnv({
    QRDONATE_BANK_NAME: "토스뱅크",
    QRDONATE_ACCOUNT_NUMBER: "1000-2000-3000",
    QRDONATE_ACCOUNT_HOLDER: "라노벨",
    QRDONATE_TITLE: "개발자한테 커피 한 잔 쏘기!",
    QRDONATE_DESCRIPTION: "작은 응원이 개발자에게는 큰 힘이 됩니다!!",
    QRDONATE_FALLBACK_NOTICE:
      "QR 인식이 안되면 아래 계좌 번호로 부탁드립니다!",
    QRDONATE_QR_IMAGE_URL: "/assets/toss-qr-5000.webp",
    QRDONATE_MASCOT_IMAGE_URL: "/assets/coffee-mascot.png",
    QRDONATE_QR_SIZE: "340",
    QRDONATE_QR_LINK:
      "supertoss://send?amount=5000&bank=%ED%86%A0%EC%8A%A4%EB%B1%85%ED%81%AC&accountNo=100020003000&origin=qr",
    QRDONATE_TOSS_URL_TEMPLATE:
      "toss://transfer?bank={bank}&account={account}&amount={amount}",
  });

  const svg = await renderQrSvg(config, { amount: 3000 });
  const html = renderDonationPageHtml(config, { qrSvg: svg, amount: 3000 });
  const publicConfig = toPublicConfig(config);

  assert.match(svg, /^<svg/);
  assert.match(html, /개발자한테 커피 한 잔 쏘기!/);
  assert.doesNotMatch(html, /헤헤/);
  assert.match(html, /작은 응원이 개발자에게는 큰 힘이 됩니다!!/);
  assert.match(html, /\.description \{[\s\S]*font-weight: 400;/);
  assert.match(html, /1000-2000-3000/);
  assert.match(html, /copyAccount/);
  assert.match(html, /openToss/);
  assert.match(html, /desktopOnly/);
  assert.match(html, /mobileOnly/);
  assert.match(html, /isMobileRuntime/);
  assert.match(html, /\/assets\/toss-qr-5000\.webp/);
  assert.match(html, /mascotImage/);
  assert.match(html, /\.thanksRow \{[\s\S]*place-items: center;/);
  assert.match(html, /\.mascotImage \{[\s\S]*width: auto;/);
  assert.match(html, /\.mascotImage \{[\s\S]*max-height: 132px;/);
  assert.match(html, /\.qrFrame \{[\s\S]*justify-self: center;/);
  assert.match(html, /\.qrFrame \{[\s\S]*width: min\(100%, 326px\);/);
  assert.match(html, /\.qrFrame \{[\s\S]*padding: 7px;/);
  assert.match(html, /\.qrImage \{[\s\S]*width: min\(100%, 292px\);/);
  assert.match(html, /\/assets\/coffee-mascot\.png/);
  assert.equal(publicConfig.thanksText, "");
  assert.equal(publicConfig.mascotImageUrl, "/assets/coffee-mascot.png");
  assert.match(html, /supertoss:\/\/send\?amount=5000/);
  assert.match(html, /pretendard\.css/);
  assert.match(html, /font-family: Pretendard/);
  assert.match(
    html,
    /QR 인식이 안되면 아래 계좌 번호로 부탁드립니다!/,
  );
  assert.doesNotMatch(html, /송금 금액:/);
  assert.doesNotMatch(html, /data-qr-fallback="svg"/);
});

test("clipboard 권한이 없을 때도 fallback 복사 경로를 제공한다", async () => {
  const config = buildDonationConfigFromEnv({
    QRDONATE_BANK_NAME: "토스뱅크",
    QRDONATE_ACCOUNT_NUMBER: "1000-2000-3000",
    QRDONATE_TOSS_URL_TEMPLATE:
      "toss://transfer?bank={bank}&account={account}&amount={amount}",
  });

  const svg = await renderQrSvg(config, { amount: 3000 });
  const html = renderDonationPageHtml(config, { qrSvg: svg, amount: 3000 });

  assert.match(html, /copyAccountText/);
  assert.match(html, /document\.execCommand\("copy"\)/);
  assert.match(html, /catch/);
});

test("Vercel 함수 handler가 QRDonate API를 Web Response로 제공한다", async () => {
  const env = {
    QRDONATE_BANK_NAME: "토스뱅크",
    QRDONATE_ACCOUNT_NUMBER: "1000-2000-3000",
    QRDONATE_ACCOUNT_HOLDER: "라노벨",
    QRDONATE_DEFAULT_AMOUNT: "5000",
    QRDONATE_QR_IMAGE_URL: "/assets/toss-qr-5000.webp",
    QRDONATE_MASCOT_IMAGE_URL: "/assets/coffee-mascot.png",
  };

  const pageResponse = await handleQrDonateVercelRequest(
    new Request("https://qrdonate.vercel.app/api/qr-donate/page?amount=5000", {
      headers: { accept: "text/html" },
    }),
    "page",
    env,
  );
  const pageHtml = await pageResponse.text();

  assert.equal(pageResponse.status, 200);
  assert.match(pageResponse.headers.get("content-type") || "", /text\/html/);
  assert.match(pageHtml, /개발자한테 커피 한 잔 쏘기!/);
  assert.match(pageHtml, /\/assets\/toss-qr-5000\.webp/);

  const configResponse = await handleQrDonateVercelRequest(
    new Request("https://qrdonate.vercel.app/api/qr-donate/config"),
    "config",
    env,
  );
  const configBody = await configResponse.json() as {
    ok: boolean;
    config: { bankName: string; accountMasked: string };
  };

  assert.equal(configResponse.status, 200);
  assert.equal(configBody.ok, true);
  assert.equal(configBody.config.bankName, "토스뱅크");
  assert.equal(configBody.config.accountMasked, "1000-****-3000");

  const payloadResponse = await handleQrDonateVercelRequest(
    new Request("https://qrdonate.vercel.app/api/qr-donate/payload?amount=7000"),
    "payload",
    env,
  );
  const payloadBody = await payloadResponse.json() as {
    ok: boolean;
    amount: number;
    transferUrl: string;
  };

  assert.equal(payloadBody.ok, true);
  assert.equal(payloadBody.amount, 7000);
  assert.match(payloadBody.transferUrl, /^supertoss:\/\/send\?amount=7000/);

  const widgetResponse = await handleQrDonateVercelRequest(
    new Request("https://qrdonate.vercel.app/api/qr-donate/widget.js"),
    "widget",
    env,
  );
  const widgetScript = await widgetResponse.text();

  assert.equal(widgetResponse.status, 200);
  assert.match(widgetResponse.headers.get("content-type") || "", /application\/javascript/);
  assert.match(widgetScript, /https:\/\/qrdonate\.vercel\.app/);
  assert.match(widgetScript, /embedded=1/);
});

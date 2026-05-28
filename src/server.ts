import "dotenv/config";

import { buildDonationConfigFromEnv, parseAmount } from "./config.js";
import {
  normalizeQrDonateError,
  writeQrDonateErrorLog,
} from "./errors.js";
import { createQrDonateServer } from "./http.js";

/** env 설정을 읽어 QRDonate 독립 서버를 시작한다. */
async function main(): Promise<void> {
  try {
    const config = buildDonationConfigFromEnv(process.env);
    const port = parseAmount(process.env.QRDONATE_PORT ?? process.env.PORT ?? "8787");
    const server = createQrDonateServer(config);

    server.listen(port, () => {
      process.stdout.write(`QRDonate listening on http://localhost:${port}\n`);
    });
  } catch (error) {
    const normalized = normalizeQrDonateError(error);
    writeQrDonateErrorLog(normalized, {
      input: { env: "process.env" },
      output: { status: normalized.status },
    });
    process.exitCode = 1;
  }
}

void main();

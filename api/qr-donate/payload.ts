import { handleQrDonateVercelRequest } from "../../src/vercelHandler.js";

/** Vercel에서 토스 송금 payload JSON을 제공한다. */
export default {
  fetch(request: Request): Promise<Response> {
    return handleQrDonateVercelRequest(request, "payload");
  },
};

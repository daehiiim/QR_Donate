import { handleQrDonateVercelRequest } from "../../src/vercelHandler.js";

/** Vercel에서 공개 설정 JSON을 제공한다. */
export default {
  fetch(request: Request): Promise<Response> {
    return handleQrDonateVercelRequest(request, "config");
  },
};

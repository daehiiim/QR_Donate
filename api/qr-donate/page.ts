import { handleQrDonateVercelRequest } from "../../src/vercelHandler.js";

/** Vercel에서 QRDonate 후원 화면을 제공한다. */
export default {
  fetch(request: Request): Promise<Response> {
    return handleQrDonateVercelRequest(request, "page");
  },
};

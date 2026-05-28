import { handleQrDonateVercelRequest } from "../../src/vercelHandler.js";

/** Vercel에서 QR SVG 응답을 제공한다. */
export default {
  fetch(request: Request): Promise<Response> {
    return handleQrDonateVercelRequest(request, "svg");
  },
};

import { handleQrDonateVercelRequest } from "../../src/vercelHandler.js";

/** Vercel에서 외부 삽입용 widget script를 제공한다. */
export default {
  fetch(request: Request): Promise<Response> {
    return handleQrDonateVercelRequest(request, "widget");
  },
};

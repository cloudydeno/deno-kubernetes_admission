export {
  AdmissionContext,
} from "./admission-context.ts";
export type {
  WebhookRule,
} from "./admission-context.ts";

export {
  AdmissionHandler,
} from "./admission-handler.ts";
export type {
  DefaultWebhookConfig,
} from "./admission-handler.ts";

//------------------

import { serveHttp } from "./deps.ts";
import { AdmissionHandler } from "./admission-handler.ts";
export class AdmissionServer extends AdmissionHandler {

  async servePlaintext({
    port = 8000,
    hostname = '[::]',
  } = {}) {
    console.log(`Available @ http://localhost:${port}/`);
    await serveHttp(async req => {
      const resp = await this.handleRequest(req);
      resp.headers.set("server", `deno-kubernetes_admission/0.1.0`);
      return resp;
    }, {
      port,
      hostname,
      onError: this.errorResponse,
    });
  }

  errorResponse(err: unknown) {
    const errMsg = err instanceof Error
      ? (err.stack || err.message)
      : null;
    const msg = errMsg || JSON.stringify(err);

    console.error('!!!', msg);
    return new Response(`Internal Error!\n\n${msg}`, {status: 500});
  }

}

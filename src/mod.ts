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

import { serveHttp, serveHttps } from "./deps.ts";
import { AdmissionHandler } from "./admission-handler.ts";
import { watchFiles } from "./file-watcher.ts";
export class AdmissionServer extends AdmissionHandler {

  async serve(opts: {
    port?: number;
    hostname?: string;
  } = {}) {
    const tlsDirectory = Deno.env.get('WEBHOOK_TLS_DIRECTORY');
    if (tlsDirectory) await this.serveHttps(tlsDirectory, opts);
    else await this.servePlaintext(opts);
  }

  async servePlaintext({
    port = 8000,
    hostname = '[::]',
  } = {}) {
    console.log(`Available @ http://localhost:${port}/`);
    await serveHttp(this.serveRequest.bind(this), {
      port, hostname,
      onError: this.errorResponse,
    });
  }

  async serveHttps(tlsDirectory: string, {
    port = 8443,
    hostname = '[::]',
  } = {}) {
    const certFile = `${tlsDirectory || '.'}/tls.crt`;
    const keyFile = `${tlsDirectory || '.'}/tls.key`;
    for await (const signal of watchFiles([certFile, keyFile])) {
      console.log(`Available @ https://localhost:${port}/`);
      await serveHttps(this.serveRequest.bind(this), {
        port, hostname,
        onError: this.errorResponse,
        certFile, keyFile,
        signal,
      });
    }
  }

  async serveRequest(request: Request) {
    const resp = await this.handleRequest(request);
    resp.headers.set("server", `deno-kubernetes_admission/0.1.0`);
    return resp;
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

import { serve, serveTls } from "https://deno.land/std@0.125.0/http/server.ts";

import {
  fromMutatingWebhookConfiguration,
  fromValidatingWebhookConfiguration,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/admissionregistration.k8s.io@v1/structs.ts";
import {
  fromAdmissionReview, toAdmissionReview,
} from "./admission-review.ts";
import {
  WebhookRule,
  AdmissionContext,
} from "./admission-context.ts";
export { AdmissionContext };

export interface DefaultWebhookConfig {
  failurePolicy: 'Ignore' | 'Fail';
  matchPolicy: 'Exact' | 'Equivalent';
  sideEffects: 'Unknown' | 'None' | 'Some' | 'NoneOnDryRun';
  reinvocationPolicy: 'Never' | 'IfNeeded';
  name?: string;
};
const defaultWebhookConfigDefaults: DefaultWebhookConfig = {
  failurePolicy: 'Fail',
  matchPolicy: 'Exact',
  sideEffects: 'None',
  reinvocationPolicy: 'IfNeeded',
};

export class AdmissionServer {
  constructor(
    public metadata: {
      name: string;
      repo: string;
    },
  ) {}
  mutatingRules = new Array<WebhookRule>();
  validatingRules = new Array<WebhookRule>();
  defaultWebhookConfig: Partial<DefaultWebhookConfig> = {};

  withMutatingRule(rule: WebhookRule) {
    this.mutatingRules.push(rule);
    return this;
  }
  withValidatingRule(rule: WebhookRule) {
    this.validatingRules.push(rule);
    return this;
  }
  withDefaultWebhookConfig(config: Partial<DefaultWebhookConfig>) {
    this.defaultWebhookConfig = config;
    return this;
  }

  async servePlaintext(port = 8000) {
    console.log(`Available @ http://localhost:${port}/`);
    await serve(async req => {
      const resp = await this.handleRequest(req);
      resp.headers.set("server", `kubernetes-aws-identity-webhook/0.1.0`);
      return resp;
    }, {
      port,
      hostname: '[::]',
      onError(err: any) {
        const msg = err.stack || err.message || JSON.stringify(err);
        console.error('!!!', msg);
        return new Response(`Internal Error!\n${msg}`, {status: 500});
      },
    });
  }

  async handleRequest(request: Request) {
    const {pathname, origin, hostname} = new URL(request.url);

    if (pathname === "/webhook-config.yaml") {
      return new Response(this.buildConfigManifest(origin, hostname));
    }

    if (pathname === '/') return new Response(`<!doctype html>\n<title>${origin}</title>
<p>This is a webhook server specifically for Kubernetes AdmissionReview purposes.\n
<p><code>$ kubectl apply -f "<a href="${origin}/webhook-config.yaml">${origin}/webhook-config.yaml</a>"</code>\n
<p>See also: <a href="${this.metadata.repo}">${this.metadata.repo}</a>`, {
  headers: { 'content-type': 'text/html' },
});

    const isMutate = pathname === '/admission/mutate';
    const isValidate = pathname === '/admission/validate';
    if (!isMutate && !isValidate) return new Response(`Not Found`, { status: 404 });

    if (request.method !== "POST") return new Response(
      "Method Not Allowed. This is a webhook endpoint.",
      { status: 405 });

    if (request.headers.get("content-type") !== 'application/json') return new Response(
      "Please provide 'content-type: application/json' header",
      { status: 400 });

    const review = toAdmissionReview(await request.json());
    if (!review.request?.uid) return new Response(
      "I didn't see a request in your review payload :/",
      { status: 400 });

    const ctx = new AdmissionContext(review.request);

    if (isMutate) {
      await ctx.applyHooks(this.mutatingRules);
      ctx.log(`Generated ${ctx.jsonPatches.length} patches.`);
      for (const patch of ctx.jsonPatches) {
        ctx.log(`- ${JSON.stringify(patch)}`);
      }
    }

    if (isValidate) {
      await ctx.applyHooks(this.validatingRules);
      ctx.log(`Allowed: ${ctx.response.allowed}`);
    }

    const respJson = JSON.stringify(fromAdmissionReview({
      response: ctx.getResponse(),
    }), null, 2);

    return new Response(respJson, {
      headers: {
        "Content-Type": "application/json",
      }});
  }

  buildConfigManifest(origin: string, hostname: string) {
    const metadata = {
      name: this.metadata.name,
      labels: {
        app: this.metadata.name,
      },
      annotations: {
        repo: this.metadata.repo,
      },
    };
    const baseConfig = {
      admissionReviewVersions: ['v1'],
      name: hostname,
      ...defaultWebhookConfigDefaults,
      ...this.defaultWebhookConfig,
    };

    const blocks = new Array<string>();
    if (this.mutatingRules.length > 0) {
      blocks.push(`---\n`+JSON.stringify(fromMutatingWebhookConfiguration({
        metadata,
        webhooks: [{
          ...baseConfig,
          clientConfig: { url: `${origin}/admission/mutate` },
          rules: this.mutatingRules,
        }],
      }), null, 2)+`\n`);
    }
    if (this.validatingRules.length > 0) {
      const {
        reinvocationPolicy, // Only relevant for mutating, so pull out + ignore here
        ...validatingConfig
      } = baseConfig;
      blocks.push(`---\n`+JSON.stringify(fromValidatingWebhookConfiguration({
        metadata,
        webhooks: [{
          ...validatingConfig,
          clientConfig: { url: `${origin}/admission/validate` },
          rules: this.validatingRules,
        }],
      }), null, 2)+`\n`);
    }
    return blocks.join('\n\n');
  }

}

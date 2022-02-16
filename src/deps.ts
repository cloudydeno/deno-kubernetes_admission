// /x/kubernetes_apis

export type {
  JsonPatchOp,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/common.ts";
export * as c from "https://deno.land/x/kubernetes_apis@v0.3.2/common.ts";

export type {
  Status,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/meta@v1/structs.ts";
export {
  fromStatus,
  toStatus,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/meta@v1/structs.ts";

export type {
  UserInfo,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/authentication.k8s.io@v1/structs.ts";
export {
  fromUserInfo,
  toUserInfo,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/authentication.k8s.io@v1/structs.ts";

export {
  fromMutatingWebhookConfiguration,
  fromValidatingWebhookConfiguration,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/admissionregistration.k8s.io@v1/structs.ts";

// /std

export * as Base64 from "https://deno.land/std@0.125.0/encoding/base64.ts";

export {
  serve as serveHttp,
  serveTls as serveHttps,
} from "https://deno.land/std@0.125.0/http/server.ts";

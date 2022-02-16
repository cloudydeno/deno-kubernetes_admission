import { AdmissionServer } from "../../src/mod.ts";
import * as CoreV1 from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/core@v1/structs.ts";

new AdmissionServer({
  name: 'annotate-configmaps',
  repo: 'https://github.com/cloudydeno/deno-kubernetes_admission',
}).withMutatingRule({
  operations: ['CREATE', 'UPDATE'],
  apiGroups: [''],
  apiVersions: ['v1'],
  resources: ['configmaps'],
  scope: 'Namespaced',
  callback(ctx) {
    const configMap = CoreV1.toConfigMap(ctx.request.object);
    const annotationKey = 'cloudydeno.github.io/example';

    const existingVal = configMap.metadata?.annotations?.[annotationKey];
    if (existingVal) {
      ctx.log(`Annotation already found; skipping`);
      return;
    }

    ctx.log(`Adding annotation :)`);
    ctx.addPatch({
      op: 'add',
      path: `/metadata/annotations/${annotationKey.replaceAll('/', '~1')}`,
      value: 'mutated',
    });
  },
}).servePlaintext();

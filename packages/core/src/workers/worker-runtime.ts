import type { WorkerEvent, WorkerRequest } from "#core/types/index";
import { WorkerRuntimeController } from "#core/workers/worker-runtime-controller";

const scope = self as DedicatedWorkerGlobalScope;

const post = (event: WorkerEvent, transfer: Transferable[] = []): void => {
  scope.postMessage(event, transfer);
};

const runtime = new WorkerRuntimeController(post);

scope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  void runtime.dispatch(event.data);
});

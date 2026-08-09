import { MAX_WORKERS } from "#core/constants/index";
import { RLottieError } from "#core/errors/rlottie-error";
import type {
  WorkerEvent,
  WorkerLease,
  WorkerPoolRegistryRecord,
  WorkerRegistryHost,
} from "#core/types/index";
import { WorkerPool } from "#core/workers/worker-pool";

const REGISTRY_KEY = Symbol.for("@module-foundry/rlottie-web/worker-pool/v2");

const defaultMaxWorkers = (): number => {
  const concurrency = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency;

  return Math.min(Math.max((concurrency || 2) - 1, 1), MAX_WORKERS);
};

const getRegistryRecord = (host: WorkerRegistryHost): WorkerPoolRegistryRecord => {
  const existing = host[REGISTRY_KEY];

  if (existing !== undefined) {
    return existing;
  }

  const created: WorkerPoolRegistryRecord = {
    references: 0,
    pool: new WorkerPool(defaultMaxWorkers()),
  };

  host[REGISTRY_KEY] = created;

  return created;
};

export const acquireWorkerLease = (
  playerId: string,
  onEvent: (event: WorkerEvent) => void,
  affinityKey?: string,
): WorkerLease => {
  if (typeof Worker === "undefined") {
    throw new RLottieError("CANVAS_UNAVAILABLE", "Dedicated Worker is unavailable");
  }

  const host = globalThis as WorkerRegistryHost;
  const record = getRegistryRecord(host);

  record.references += 1;

  const assignment = record.pool.assign(playerId, onEvent, affinityKey);
  let destroyed = false;

  return {
    post: (message, transfer) => {
      assignment.post(message, transfer);
    },
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      assignment.destroy();

      const current = host[REGISTRY_KEY];

      if (current === undefined) {
        return;
      }

      current.references -= 1;

      if (current.references !== 0) {
        return;
      }

      current.pool.scheduleIdleDestroy(() => {
        if (host[REGISTRY_KEY] === current && current.references === 0) {
          current.pool.destroy();
          Reflect.deleteProperty(host, REGISTRY_KEY);
        }
      });
    },
  };
};

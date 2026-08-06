import { createAbortError } from "#core/sources/source-errors";
import type { LoadedSource, PendingEntry } from "#core/types/index";

const raceAbort = async <Value>(task: Promise<Value>, signal: AbortSignal): Promise<Value> => {
  if (signal.aborted) {
    throw createAbortError(signal.reason);
  }

  return new Promise<Value>((resolve, reject) => {
    const onAbort = () => {
      reject(createAbortError(signal.reason));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    void task.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
};

export const consumePending = async (
  entry: PendingEntry,
  signal: AbortSignal,
): Promise<LoadedSource> => {
  if (entry.abortTimer !== undefined) {
    clearTimeout(entry.abortTimer);
    entry.abortTimer = undefined;
  }

  entry.consumers += 1;

  try {
    return await raceAbort(entry.task, signal);
  } finally {
    entry.consumers -= 1;

    if (entry.consumers === 0 && !entry.settled) {
      entry.abortTimer = setTimeout(() => {
        entry.abortTimer = undefined;

        if (entry.consumers === 0 && !entry.settled) {
          entry.controller.abort();
        }
      }, 0);
    }
  }
};

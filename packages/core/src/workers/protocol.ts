import type { WorkerEvent } from "#core/types/index";

export const isWorkerEvent = (value: unknown): value is WorkerEvent =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string" &&
  "playerId" in value;

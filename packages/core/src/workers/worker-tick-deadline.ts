import { advanceDeadline } from "#core/workers/frame-rate-limiter";

export const nextWorkerTickDeadline = (
  deadline: number,
  startedAt: number,
  finishedAt: number,
  interval: number,
): number =>
  finishedAt - startedAt >= interval ? finishedAt : advanceDeadline(deadline, finishedAt, interval);

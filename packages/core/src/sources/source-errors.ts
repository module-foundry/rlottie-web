import { RLottieError } from "#core/errors/rlottie-error";

export const createAbortError = (cause?: unknown): RLottieError =>
  new RLottieError("SOURCE_ABORTED", "The source request was aborted", { cause });

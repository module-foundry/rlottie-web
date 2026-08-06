import { RLottieError } from "#core/errors/rlottie-error";
import type { RLottieErrorCode } from "#core/types/index";

export const asRLottieError = (
  value: unknown,
  fallbackCode: RLottieErrorCode,
  fallbackMessage: string,
): RLottieError => {
  if (value instanceof RLottieError) {
    return value;
  }

  return new RLottieError(fallbackCode, fallbackMessage, { cause: value });
};

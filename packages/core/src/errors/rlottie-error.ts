import type { RLottieErrorCode } from "#core/types/index";

/** Error with a machine-readable code and an optional original cause. */
export class RLottieError extends Error {
  public readonly code: RLottieErrorCode;

  public constructor(code: RLottieErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "RLottieError";
    this.code = code;
  }
}

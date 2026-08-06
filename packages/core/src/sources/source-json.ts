import { RLottieError } from "#core/errors/rlottie-error";
import type { LoadedSource } from "#core/types/index";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RLottieError("SOURCE_INVALID_JSON", `Lottie ${field} must be a finite number`);
  }

  return value;
};

const finitePositive = (value: unknown, field: string): number => {
  const number = finiteNumber(value, field);

  if (number <= 0) {
    throw new RLottieError("SOURCE_INVALID_JSON", `Lottie ${field} must be positive`);
  }

  return number;
};

export const parseLottieJson = (json: string): LoadedSource => {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new RLottieError("SOURCE_INVALID_JSON", "Source is not valid JSON", { cause: error });
  }

  if (!isRecord(value)) {
    throw new RLottieError("SOURCE_INVALID_JSON", "Lottie JSON must be an object");
  }

  const width = finitePositive(value.w, "w");
  const height = finitePositive(value.h, "h");
  const frameRate = finitePositive(value.fr, "fr");
  const inPoint = finiteNumber(value.ip, "ip");
  const outPoint = finiteNumber(value.op, "op");

  if (outPoint <= inPoint) {
    throw new RLottieError("SOURCE_INVALID_JSON", "Lottie op must be greater than ip");
  }

  const totalFrames = Math.max(1, Math.ceil(outPoint - inPoint));

  return {
    json,
    bytes: new TextEncoder().encode(json).byteLength,
    metadata: {
      width,
      height,
      frameRate,
      totalFrames,
      duration: totalFrames / frameRate,
    },
  };
};

import { Format, Type } from "#core/types/index";
import type { LocalLottieSource, LottieSource } from "#core/types/index";

const sameLocalSource = (left: LocalLottieSource, right: LocalLottieSource): boolean => {
  if (left.type === Type.JSON && right.type === Type.JSON) {
    return left.json === right.json;
  }

  if (left.type === Type.TGS && right.type === Type.TGS) {
    return left.binary === right.binary;
  }

  return false;
};

export const sameSource = (left: LottieSource | undefined, right: LottieSource): boolean => {
  if (left === right) {
    return true;
  }

  if (left === undefined || left.format !== right.format) {
    return false;
  }

  if (left.cacheKey !== undefined || right.cacheKey !== undefined) {
    return left.cacheKey === right.cacheKey;
  }

  if (left.format === Format.URL) {
    return right.format === Format.URL && left.type === right.type && left.url === right.url;
  }

  return right.format === Format.Local && sameLocalSource(left, right);
};

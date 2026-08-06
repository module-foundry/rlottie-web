import { gunzipSync } from "fflate";

import { GZIP_MAGIC_FIRST_BYTE, GZIP_MAGIC_SECOND_BYTE } from "#core/constants/index";
import { RLottieError } from "#core/errors/rlottie-error";
import { createAbortError } from "#core/sources/source-errors";

export const readBinary = async (
  binary: ArrayBuffer | Uint8Array | Blob | File,
  signal: AbortSignal,
): Promise<Uint8Array> => {
  if (binary instanceof Uint8Array) {
    return new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
  }

  if (binary instanceof ArrayBuffer) {
    return new Uint8Array(binary);
  }

  const buffer = await binary.arrayBuffer();

  if (signal.aborted) {
    throw createAbortError(signal.reason);
  }

  return new Uint8Array(buffer);
};

export const decodeUtf8 = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new RLottieError("SOURCE_INVALID_UTF8", "Source is not valid UTF-8", { cause: error });
  }
};

export const decodeTgs = (bytes: Uint8Array, limit: number): string => {
  if (bytes[0] !== GZIP_MAGIC_FIRST_BYTE || bytes[1] !== GZIP_MAGIC_SECOND_BYTE) {
    throw new RLottieError("SOURCE_INVALID_GZIP", "TGS source does not have gzip magic bytes");
  }

  let decompressed: Uint8Array;

  try {
    decompressed = gunzipSync(bytes);
  } catch (error) {
    throw new RLottieError("SOURCE_INVALID_GZIP", "TGS source is not valid gzip", { cause: error });
  }

  if (decompressed.byteLength > limit) {
    throw new RLottieError(
      "SOURCE_TOO_LARGE",
      `Decoded TGS exceeds the ${String(limit)} byte limit`,
    );
  }

  return decodeUtf8(decompressed);
};

import { SourceLoader } from "#core/sources/source-loader";
import type { SourceLoaderContract, SourceLoaderRegistryHost } from "#core/types/index";

const REGISTRY_KEY = Symbol.for("@module-foundry/rlottie-web/source-loader/v1");

export const getDefaultSourceLoader = (): SourceLoaderContract => {
  const host = globalThis as SourceLoaderRegistryHost;
  const existing = host[REGISTRY_KEY];

  if (existing !== undefined) {
    return existing;
  }

  const created = new SourceLoader();

  host[REGISTRY_KEY] = created;

  return created;
};

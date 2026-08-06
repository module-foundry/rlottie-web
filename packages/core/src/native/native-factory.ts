import { CApiAnimation } from "#core/native/c-api-animation";
import type {
  BaselineModule,
  CApiModule,
  NativeFactory,
  WasmModuleFactory,
} from "#core/types/index";

let nativeFactoryPromise: Promise<NativeFactory> | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBaselineModule = (value: unknown): value is BaselineModule =>
  isRecord(value) && typeof value.RlottieWasm === "function";

const isCApiModule = (value: unknown): value is CApiModule =>
  isRecord(value) &&
  value.HEAPU8 instanceof Uint8Array &&
  typeof value._malloc === "function" &&
  typeof value._free === "function" &&
  typeof value._animation_create_from_json === "function" &&
  typeof value._animation_destroy === "function" &&
  typeof value._animation_render === "function" &&
  typeof value.lengthBytesUTF8 === "function" &&
  typeof value.stringToUTF8 === "function";

const isModuleFactory = (value: unknown): value is WasmModuleFactory => typeof value === "function";

const createBaselineFactory = (module: BaselineModule): NativeFactory => ({
  create: json => {
    const animation = new module.RlottieWasm();

    if (animation.load(json)) {
      return animation;
    }

    animation.delete();

    throw new Error("RLottie rejected the animation JSON");
  },
});

const createNativeFactory = async (): Promise<NativeFactory> => {
  const url = new URL("./rlottie-wasm.js", import.meta.url).href;
  const namespace: unknown = await import(url);

  if (!isRecord(namespace)) {
    throw new Error("WASM glue module is invalid");
  }

  if (namespace.ready instanceof Promise) {
    const module: unknown = await namespace.ready;

    if (!isBaselineModule(module)) {
      throw new Error("Baseline Embind module is invalid");
    }

    return createBaselineFactory(module);
  }

  if (!isModuleFactory(namespace.default)) {
    throw new Error("WASM glue does not export a module factory");
  }

  const module: unknown = await namespace.default({
    locateFile: (path: string) => new URL(path, url).href,
  });

  if (!isCApiModule(module)) {
    throw new Error("RLottie C ABI module is invalid");
  }

  return { create: json => new CApiAnimation(module, json) };
};

export const loadNativeFactory = async (): Promise<NativeFactory> => {
  nativeFactoryPromise ??= createNativeFactory();

  return nativeFactoryPromise;
};

import { RGBA_CHANNEL_COUNT } from "#core/constants/index";
import type { CApiModule, NativeAnimation } from "#core/types/index";

export class CApiAnimation implements NativeAnimation {
  #handle = 0;
  readonly #module: CApiModule;

  public constructor(module: CApiModule, json: string) {
    this.#module = module;

    const bytes = module.lengthBytesUTF8(json) + 1;
    const pointer = module._malloc(bytes);

    if (pointer === 0) {
      throw new Error("Unable to allocate source JSON in WASM memory");
    }

    try {
      module.stringToUTF8(json, pointer, bytes);
      this.#handle = module._animation_create_from_json(pointer);
    } finally {
      module._free(pointer);
    }

    if (this.#handle === 0) {
      throw new Error("RLottie rejected the animation JSON");
    }
  }

  public delete(): void {
    if (this.#handle === 0) {
      return;
    }

    this.#module._animation_destroy(this.#handle);
    this.#handle = 0;
  }

  public render(frame: number, width: number, height: number): Uint8Array {
    if (this.#handle === 0) {
      throw new Error("Animation handle is destroyed");
    }

    const pointer = this.#module._animation_render(this.#handle, frame, width, height);

    if (pointer === 0) {
      throw new Error("RLottie render failed");
    }

    return new Uint8Array(this.#module.HEAPU8.buffer, pointer, width * height * RGBA_CHANNEL_COUNT);
  }
}

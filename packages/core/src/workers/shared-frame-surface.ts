export class SharedFrameSurface {
  readonly #canvas = new OffscreenCanvas(1, 1);
  readonly #context: OffscreenCanvasRenderingContext2D;
  #destroyed = false;
  #imageData: ImageData | undefined;
  #imageKey = "";

  public constructor() {
    const context = this.#canvas.getContext("2d");

    if (context === null) {
      throw new Error("Shared frame 2D context is unavailable");
    }

    this.#context = context;
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#imageData = undefined;
    this.#imageKey = "";
    this.#canvas.width = 0;
    this.#canvas.height = 0;
  }

  public write(pixels: Uint8Array, width: number, height: number): OffscreenCanvas {
    if (this.#destroyed) {
      throw new Error("Shared frame surface is destroyed");
    }

    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width;
      this.#canvas.height = height;
      this.#imageData = undefined;
      this.#imageKey = "";
    }

    const key = [width, height, pixels.byteOffset, pixels.byteLength].join(":");

    if (
      this.#imageData === undefined ||
      this.#imageKey !== key ||
      this.#imageData.data.buffer !== pixels.buffer
    ) {
      const rgba =
        pixels.buffer instanceof ArrayBuffer
          ? new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength)
          : new Uint8ClampedArray(pixels);

      this.#imageData = new ImageData(rgba, width, height);
      this.#imageKey = key;
    }

    this.#context.putImageData(this.#imageData, 0, 0);

    return this.#canvas;
  }
}

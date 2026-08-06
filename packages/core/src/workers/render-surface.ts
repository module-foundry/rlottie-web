import type { Rect, RenderPath, WorkerEvent } from "#core/types/index";

export class RenderSurface {
  public readonly renderPath: RenderPath;
  readonly #canvas: OffscreenCanvas;
  readonly #context: OffscreenCanvasRenderingContext2D;
  #destroyed = false;
  #imageData: ImageData | undefined;
  #imageKey = "";
  readonly #playerId: string;

  readonly #post: (event: WorkerEvent, transfer?: Transferable[]) => void;

  public constructor(
    playerId: string,
    canvas: OffscreenCanvas | undefined,
    width: number,
    height: number,
    post: (event: WorkerEvent, transfer?: Transferable[]) => void,
  ) {
    this.#playerId = playerId;
    this.#post = post;
    this.renderPath = canvas === undefined ? "image-bitmap" : "offscreen-direct";
    this.#canvas = canvas ?? new OffscreenCanvas(Math.max(1, width), Math.max(1, height));

    const context = this.#canvas.getContext("2d");

    if (context === null) {
      throw new Error("Offscreen 2D context is unavailable");
    }

    this.#context = context;
    this.resize(width, height);
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#imageData = undefined;
    this.#canvas.width = 0;
    this.#canvas.height = 0;
  }

  public get height(): number {
    return this.#canvas.height;
  }

  public present(pixels: Uint8Array, rect: Rect): void {
    if (this.#destroyed) {
      return;
    }

    this.#context.clearRect(0, 0, this.width, this.height);

    const key = [rect.width, rect.height, pixels.byteOffset, pixels.byteLength].join(":");

    if (
      this.#imageData === undefined ||
      this.#imageKey !== key ||
      this.#imageData.data.buffer !== pixels.buffer
    ) {
      const rgba =
        pixels.buffer instanceof ArrayBuffer
          ? new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength)
          : new Uint8ClampedArray(pixels);

      this.#imageData = new ImageData(rgba, rect.width, rect.height);
      this.#imageKey = key;
    }

    this.#context.putImageData(this.#imageData, rect.x, rect.y);

    if (this.renderPath === "image-bitmap") {
      const bitmap = this.#canvas.transferToImageBitmap();

      this.#post({ bitmap, type: "bitmap", playerId: this.#playerId }, [bitmap]);
    }
  }

  public resize(width: number, height: number): boolean {
    const nextWidth = Math.max(0, Math.floor(width));
    const nextHeight = Math.max(0, Math.floor(height));

    if (this.#canvas.width === nextWidth && this.#canvas.height === nextHeight) {
      return false;
    }

    this.#canvas.width = nextWidth;
    this.#canvas.height = nextHeight;
    this.#imageData = undefined;
    this.#imageKey = "";

    return true;
  }

  public get width(): number {
    return this.#canvas.width;
  }
}

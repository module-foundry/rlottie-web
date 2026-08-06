import { RLottieError } from "#core/errors/rlottie-error";

export class CanvasPresenter {
  readonly #canvas: HTMLCanvasElement;
  #lastBitmap: ImageBitmap | undefined;
  #offscreen: OffscreenCanvas | undefined;
  #offscreenAttempted = false;
  readonly #onError: (error: RLottieError) => void;

  public constructor(canvas: HTMLCanvasElement, onError: (error: RLottieError) => void) {
    this.#canvas = canvas;
    this.#onError = onError;
  }

  public destroy(): void {
    this.#lastBitmap?.close();
    this.#lastBitmap = undefined;
  }

  public present(bitmap: ImageBitmap): void {
    this.#lastBitmap?.close();
    this.#lastBitmap = bitmap;

    const bitmapContext = this.#canvas.getContext("bitmaprenderer");

    if (bitmapContext !== null) {
      bitmapContext.transferFromImageBitmap(bitmap);
      this.#lastBitmap = undefined;

      return;
    }

    const context = this.#canvas.getContext("2d");

    if (context === null) {
      bitmap.close();
      this.#lastBitmap = undefined;
      this.#onError(
        new RLottieError("CANVAS_UNAVAILABLE", "Canvas presentation context is unavailable"),
      );

      return;
    }

    context.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    this.#lastBitmap = undefined;
  }

  public resize(width: number, height: number): void {
    if (this.#offscreen !== undefined) {
      return;
    }

    this.#canvas.width = width;
    this.#canvas.height = height;
  }

  public takeOffscreenCanvas(): OffscreenCanvas | undefined {
    if (this.#offscreenAttempted) {
      return undefined;
    }

    this.#offscreenAttempted = true;

    if (!("transferControlToOffscreen" in this.#canvas)) {
      return undefined;
    }

    try {
      this.#offscreen = this.#canvas.transferControlToOffscreen();

      return this.#offscreen;
    } catch {
      return undefined;
    }
  }
}

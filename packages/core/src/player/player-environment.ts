import type {
  EnvironmentState,
  PlayerEnvironmentCallbacks,
  ResponsiveRule,
} from "#core/types/index";

export class PlayerEnvironment {
  readonly #callbacks: PlayerEnvironmentCallbacks;
  readonly #canvas: HTMLCanvasElement;
  #destroyed = false;
  #intersectionObserver: IntersectionObserver | undefined;
  readonly #mediaCleanups: Array<() => void> = [];
  #resizeObserver: ResizeObserver | undefined;
  #state: EnvironmentState = {
    hovered: false,
    documentVisible: true,
    intersectionVisible: true,
  };

  public constructor(canvas: HTMLCanvasElement, callbacks: PlayerEnvironmentCallbacks) {
    this.#canvas = canvas;
    this.#callbacks = callbacks;
    this.#state = {
      ...this.#state,
      documentVisible: document.visibilityState !== "hidden",
    };

    document.addEventListener("visibilitychange", this.#onDocumentVisibility);
    window.addEventListener("resize", this.#onResize, { passive: true });
    this.#canvas.addEventListener("pointerenter", this.#onPointerEnter, { passive: true });
    this.#canvas.addEventListener("pointerleave", this.#onPointerLeave, { passive: true });
    this.#observeSize();
    this.#observeIntersection();
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#resizeObserver?.disconnect();
    this.#intersectionObserver?.disconnect();
    this.#resizeObserver = undefined;
    this.#intersectionObserver = undefined;
    document.removeEventListener("visibilitychange", this.#onDocumentVisibility);
    window.removeEventListener("resize", this.#onResize);
    this.#canvas.removeEventListener("pointerenter", this.#onPointerEnter);
    this.#canvas.removeEventListener("pointerleave", this.#onPointerLeave);
    this.#clearMediaQueries();
  }

  public get state(): EnvironmentState {
    return this.#state;
  }

  public updateResponsiveRules(rules: ResponsiveRule[]): void {
    this.#clearMediaQueries();

    const queries = new Set(
      rules.flatMap(rule => (rule.when.media === undefined ? [] : [rule.when.media])),
    );

    for (const query of queries) {
      const list = window.matchMedia(query);

      list.addEventListener("change", this.#onResize);
      this.#mediaCleanups.push(() => {
        list.removeEventListener("change", this.#onResize);
      });
    }
  }

  #clearMediaQueries(): void {
    for (const cleanup of this.#mediaCleanups.splice(0)) {
      cleanup();
    }
  }

  #emitGate(): void {
    this.#callbacks.onGateChange(this.#state);
  }

  #observeIntersection(): void {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    this.#intersectionObserver = new IntersectionObserver(([entry]) => {
      this.#state = {
        ...this.#state,
        intersectionVisible: entry?.isIntersecting ?? true,
      };
      this.#emitGate();
    });
    this.#intersectionObserver.observe(this.#canvas);
  }

  #observeSize(): void {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    this.#resizeObserver = new ResizeObserver(this.#onResize);
    this.#resizeObserver.observe(this.#canvas);
  }

  readonly #onDocumentVisibility = (): void => {
    this.#state = {
      ...this.#state,
      documentVisible: document.visibilityState !== "hidden",
    };
    this.#emitGate();
  };

  readonly #onPointerEnter = (): void => {
    this.#state = { ...this.#state, hovered: true };
    this.#emitGate();
  };

  readonly #onPointerLeave = (): void => {
    this.#state = { ...this.#state, hovered: false };
    this.#emitGate();
  };

  readonly #onResize = (): void => {
    if (!this.#destroyed) {
      this.#callbacks.onResize();
    }
  };
}

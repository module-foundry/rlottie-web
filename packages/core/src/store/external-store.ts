import type { RLottieListener, RLottieSnapshot } from "#core/types/index";

export class ExternalStore {
  readonly #listeners = new Set<RLottieListener>();
  #snapshot: RLottieSnapshot;

  public constructor(initial: RLottieSnapshot) {
    this.#snapshot = initial;
  }

  public clear(): void {
    this.#listeners.clear();
  }

  public getSnapshot = (): RLottieSnapshot => this.#snapshot;

  public publish(next: RLottieSnapshot): void {
    if (Object.is(this.#snapshot, next)) {
      return;
    }

    this.#snapshot = next;

    for (const listener of this.#listeners) {
      listener();
    }
  }

  public subscribe = (listener: RLottieListener): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };
}

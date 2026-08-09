import type {
  NativeAnimation,
  NativeAnimationLease,
  NativeFactory,
  WorkerAnimationEntry,
} from "#core/types/index";

const createStandaloneLease = (animation: NativeAnimation): NativeAnimationLease => {
  let destroyed = false;

  return {
    animation,
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      animation.delete();
    },
  };
};

export class WorkerAnimationRegistry {
  readonly #entries = new Map<string, WorkerAnimationEntry>();

  public acquire(sourceKey: string | undefined, json: string, factory: NativeFactory) {
    if (sourceKey === undefined) {
      return createStandaloneLease(factory.create(json));
    }

    const existing = this.#entries.get(sourceKey);

    if (existing !== undefined) {
      existing.references += 1;

      return this.#createSharedLease(sourceKey, existing);
    }

    const entry: WorkerAnimationEntry = {
      references: 1,
      animation: factory.create(json),
    };

    this.#entries.set(sourceKey, entry);

    return this.#createSharedLease(sourceKey, entry);
  }

  public clear(): void {
    for (const entry of this.#entries.values()) {
      entry.animation.delete();
    }

    this.#entries.clear();
  }

  #createSharedLease(sourceKey: string, entry: WorkerAnimationEntry): NativeAnimationLease {
    let destroyed = false;

    return {
      animation: entry.animation,
      destroy: () => {
        if (destroyed) {
          return;
        }

        destroyed = true;

        if (this.#entries.get(sourceKey) !== entry) {
          return;
        }

        entry.references -= 1;

        if (entry.references === 0) {
          this.#entries.delete(sourceKey);
          entry.animation.delete();
        }
      },
    };
  }
}

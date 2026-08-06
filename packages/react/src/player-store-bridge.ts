import type { RLottiePlayer } from "@module-foundry/rlottie-web";
import type { RLottieDiagnostics, RLottieSnapshot } from "@module-foundry/rlottie-web";

import { SERVER_SNAPSHOT } from "#react/constants/index";

export class PlayerStoreBridge {
  readonly #diagnosticsListeners = new Set<(value: RLottieDiagnostics) => void>();
  readonly #listeners = new Set<() => void>();
  #player: RLottiePlayer | null = null;
  #unsubscribe: (() => void) | undefined;
  #unsubscribeDiagnostics: (() => void) | undefined;

  public getSnapshot = (): RLottieSnapshot => this.#player?.getSnapshot() ?? SERVER_SNAPSHOT;

  public get player(): RLottiePlayer | null {
    return this.#player;
  }

  public setPlayer(player: RLottiePlayer | null): void {
    this.#unsubscribe?.();
    this.#unsubscribeDiagnostics?.();
    this.#player = player;
    this.#unsubscribe = player?.subscribe(this.#emit);
    this.#unsubscribeDiagnostics = player?.subscribeDiagnostics(this.#emitDiagnostics);
    this.#emit();
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  };

  public subscribeDiagnostics = (listener: (value: RLottieDiagnostics) => void): (() => void) => {
    this.#diagnosticsListeners.add(listener);

    return () => {
      this.#diagnosticsListeners.delete(listener);
    };
  };

  readonly #emit = (): void => {
    for (const listener of this.#listeners) {
      listener();
    }
  };

  readonly #emitDiagnostics = (diagnostics: RLottieDiagnostics): void => {
    for (const listener of this.#diagnosticsListeners) {
      listener(diagnostics);
    }
  };
}

import { RLottiePlayer } from "@module-foundry/rlottie-web";
import type {
  LottieSource,
  RLottieDiagnostics,
  RLottieMetadata,
  RLottieOptions,
  RLottieStatus,
} from "@module-foundry/rlottie-web";
import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

import { INITIAL_QUALITY } from "#solid/constants/index";
import type { CreateRLottieResult } from "#solid/types/index";

/** Bind static or accessor options to a SolidJS owner. */
export const createRLottie = (
  optionsOrAccessor: RLottieOptions | Accessor<RLottieOptions>,
): CreateRLottieResult => {
  const options =
    typeof optionsOrAccessor === "function" ? optionsOrAccessor : () => optionsOrAccessor;
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [error, setError] = createSignal<Error | null>(null);
  const [metadata, setMetadata] = createSignal<RLottieMetadata | null>(null);
  const [quality, setQuality] = createSignal(INITIAL_QUALITY);
  const [status, setStatus] = createSignal<RLottieStatus>("idle");

  let player: RLottiePlayer | undefined;
  let unsubscribe: (() => void) | undefined;
  let unsubscribeDiagnostics: (() => void) | undefined;

  const diagnosticsListeners = new Set<(diagnostics: RLottieDiagnostics) => void>();

  const pause = () => player?.pause();
  const play = () => player?.play();

  const publishDiagnostics = (diagnostics: RLottieDiagnostics) => {
    for (const listener of diagnosticsListeners) {
      listener(diagnostics);
    }
  };

  const publish = () => {
    const snapshot = player?.getSnapshot();

    if (snapshot === undefined) {
      return;
    }

    setError(snapshot.error);
    setMetadata(snapshot.metadata);
    setQuality(snapshot.quality);
    setStatus(snapshot.status);
  };

  const seek = (target: Parameters<RLottiePlayer["seek"]>[0]) => player?.seek(target);

  const start = async (source: LottieSource) => {
    if (player === undefined) {
      throw new Error("The canvas is not mounted");
    }

    return player.start(source);
  };

  const stop = () => player?.stop();

  const subscribeDiagnostics = (listener: (diagnostics: RLottieDiagnostics) => void) => {
    diagnosticsListeners.add(listener);

    return () => {
      diagnosticsListeners.delete(listener);
    };
  };

  createEffect(() => {
    const nextOptions = options();
    const element = canvas();

    if (element === undefined) {
      return;
    }

    if (player === undefined) {
      player = new RLottiePlayer(element, nextOptions);
      unsubscribe = player.subscribe(publish);
      unsubscribeDiagnostics = player.subscribeDiagnostics(publishDiagnostics);
      publish();

      return;
    }

    player.updateOptions(nextOptions);
  });

  onCleanup(() => {
    unsubscribe?.();
    unsubscribeDiagnostics?.();
    player?.destroy();
    diagnosticsListeners.clear();
    unsubscribe = undefined;
    unsubscribeDiagnostics = undefined;
    player = undefined;
  });

  return {
    play,
    seek,
    stop,
    error,
    pause,
    start,
    status,
    quality,
    metadata,
    canvasRef: setCanvas,
    subscribeDiagnostics,
  };
};

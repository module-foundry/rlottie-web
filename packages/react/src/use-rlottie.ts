import { RLottiePlayer } from "@module-foundry/rlottie-web";
import type {
  LottieSource,
  RLottieMetadata,
  RLottieOptions,
  RLottieSeekTarget,
} from "@module-foundry/rlottie-web";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { SERVER_SNAPSHOT } from "#react/constants/index";
import { PlayerStoreBridge } from "#react/player-store-bridge";
import type { UseRLottieResult } from "#react/types/index";

/** Bind an `RLottiePlayer` to React without frame-level component updates. */
export const useRLottie = (options: RLottieOptions): UseRLottieResult => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [store] = useState(() => new PlayerStoreBridge());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);
  const canvasRef = useCallback((element: HTMLCanvasElement | null) => {
    setCanvas(element);
  }, []);
  const pause = useCallback(() => store.player?.pause(), [store]);
  const play = useCallback(() => store.player?.play(), [store]);
  const seek = useCallback((target: RLottieSeekTarget) => store.player?.seek(target), [store]);
  const start = useCallback(
    async (source: LottieSource): Promise<RLottieMetadata> => {
      const player = store.player;

      if (player === null) {
        throw new Error("The canvas is not mounted");
      }

      return player.start(source);
    },
    [store],
  );
  const stop = useCallback(() => store.player?.stop(), [store]);

  useEffect(() => {
    if (canvas === null) {
      return undefined;
    }

    const player = new RLottiePlayer(canvas);

    store.setPlayer(player);

    return () => {
      store.setPlayer(null);
      player.destroy();
    };
  }, [canvas, store]);

  useEffect(() => {
    store.player?.updateOptions(options);
  });

  return {
    ...snapshot,
    play,
    seek,
    stop,
    pause,
    start,
    canvasRef,
    subscribeDiagnostics: store.subscribeDiagnostics,
  };
};

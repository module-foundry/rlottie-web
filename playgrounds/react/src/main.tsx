import "../../styles.css";

import { Format, Type } from "@module-foundry/rlottie-web";
import type { LottieSource } from "@module-foundry/rlottie-web";
import { useRLottie } from "@module-foundry/rlottie-web/reactjs";
import { StrictMode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";

import { createFpsMeter } from "./create-fps-meter";
import { RLottieFpsStore } from "./rlottie-fps-store";

const FPS_SMOOTHING_SAMPLES = 30;
const STRESS_PLAYER_COUNT = 50;
const STRESS_RESOLUTION = { width: 128, height: 128 } as const;
const ART_NOUVEAU_SOURCE: LottieSource = {
  type: Type.TGS,
  format: Format.URL,
  url: "https://cdn.changes.tg/gifts/models/Artisan%20Brick/Art%20Nouveau.tgs",
};
const BIG_CUBUS_SOURCE: LottieSource = {
  type: Type.JSON,
  format: Format.URL,
  url: "https://cdn.changes.tg/gifts/models/Artisan%20Brick/lottie/Big%20Cubus.json",
};
const EXAMPLES = [
  {
    kind: "TGS",
    label: "Art Nouveau",
    source: ART_NOUVEAU_SOURCE,
  },
  {
    kind: "JSON",
    label: "Big Cubus",
    source: BIG_CUBUS_SOURCE,
  },
] as const;
const STRESS_PLAYERS = Array.from({ length: STRESS_PLAYER_COUNT }, (_, index) => index);

const AnimationExample = ({ kind, label, source }: (typeof EXAMPLES)[number]) => {
  const { play, stop, error, pause, status, canvasRef } = useRLottie({
    source,
    fps: 60,
    loop: true,
    autoplay: true,
    visibility: "ignore",
  });

  return (
    <section className={"example"}>
      <div className={"example-heading"}>
        <h2>{label}</h2>
        <span className={"format-badge"}>{kind}</span>
      </div>
      <div className={"stage"}>
        <canvas ref={canvasRef} />
      </div>
      <div className={"toolbar"}>
        <button type={"button"} onClick={play}>
          {"Play"}
        </button>
        <button type={"button"} onClick={pause}>
          {"Pause"}
        </button>
        <button type={"button"} onClick={stop}>
          {"Stop"}
        </button>
        <span className={"status"}>{`Status: ${status}`}</span>
      </div>
      <p className={"error"}>{error?.message ?? ""}</p>
    </section>
  );
};

const FpsMeter = ({ store }: { store: RLottieFpsStore }) => {
  const valueRef = useRef<HTMLOutputElement | null>(null);
  const rlottieFps = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    let publishedSample: number | undefined;

    return createFpsMeter(FPS_SMOOTHING_SAMPLES, sample => {
      if (sample.smoothed === publishedSample) {
        return;
      }

      publishedSample = sample.smoothed;

      if (valueRef.current !== null) {
        valueRef.current.textContent = `${String(Math.round(sample.smoothed))} FPS`;
      }
    });
  }, []);

  return (
    <div className={"fps-meters"}>
      <div className={"fps-meter"}>
        <span>{"Browser/UI · rAF"}</span>
        <output ref={valueRef}>{"Measuring…"}</output>
      </div>
      <div className={"fps-meter"}>
        <span>{"RLottie · min / avg / p95 · workers · max load"}</span>
        <output>{rlottieFps}</output>
      </div>
    </div>
  );
};

const StressAnimation = ({ store, playerId }: { store: RLottieFpsStore; playerId: number }) => {
  const { canvasRef, subscribeDiagnostics } = useRLottie({
    fps: 60,
    loop: true,
    frameStep: 1,
    autoplay: true,
    responsive: [],
    playOnHover: false,
    visibility: "ignore",
    adaptiveQuality: false,
    source: BIG_CUBUS_SOURCE,
    resolution: STRESS_RESOLUTION,
  });

  useEffect(() => {
    const unsubscribe = subscribeDiagnostics(diagnostics => {
      store.record(playerId, diagnostics);
    });

    return () => {
      unsubscribe();
      store.remove(playerId);
    };
  }, [playerId, store, subscribeDiagnostics]);

  return (
    <div className={"stress-tile"}>
      <canvas ref={canvasRef} />
    </div>
  );
};

const App = () => {
  const [fpsStore] = useState(() => new RLottieFpsStore());

  useEffect(
    () => () => {
      fpsStore.destroy();
    },
    [fpsStore],
  );

  return (
    <main className={"playground playground-wide"}>
      <p className={"eyebrow"}>{"Port 3000"}</p>
      <h1>{"React playground"}</h1>
      <p className={"description"}>
        {
          "Remote TGS and JSON sources rendered at 60 FPS by the public React adapter and RLottie WASM."
        }
      </p>
      <div className={"examples"}>
        {EXAMPLES.map(example => (
          <AnimationExample key={example.label} {...example} />
        ))}
      </div>
      <section className={"stress-test"}>
        <div className={"stress-heading"}>
          <div>
            <p className={"eyebrow"}>{"Stress test"}</p>
            <h2>{"50 simultaneous lotties"}</h2>
          </div>
          <FpsMeter store={fpsStore} />
        </div>
        <p className={"stress-description"}>
          {"Fifty independent 128×128 players sharing the worker pool with a 60 FPS render cap."}
        </p>
        <div className={"stress-grid"}>
          {STRESS_PLAYERS.map(playerId => (
            <StressAnimation key={playerId} playerId={playerId} store={fpsStore} />
          ))}
        </div>
      </section>
    </main>
  );
};

const rootElement = document.querySelector<HTMLDivElement>("#root");

if (rootElement === null) {
  throw new Error("React playground root element is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

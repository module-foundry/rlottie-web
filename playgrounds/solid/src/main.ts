import "../../styles.css";

import { Format, Type } from "@module-foundry/rlottie-web";
import type { LottieSource } from "@module-foundry/rlottie-web";
import { createRLottie } from "@module-foundry/rlottie-web/solidjs";
import { createEffect, createRoot, onCleanup } from "solid-js";

const SOURCE: LottieSource = {
  type: Type.JSON,
  format: Format.URL,
  url: "https://cdn.changes.tg/gifts/models/Artisan%20Brick/lottie/Big%20Cubus.json",
};

const requireElement = <ElementType extends Element>(selector: string): ElementType => {
  const element = document.querySelector<ElementType>(selector);

  if (element === null) {
    throw new Error(`SolidJS playground element is missing: ${selector}`);
  }

  return element;
};

const canvas = requireElement<HTMLCanvasElement>("#animation");
const errorElement = requireElement<HTMLParagraphElement>("#error");
const pauseButton = requireElement<HTMLButtonElement>("#pause");
const playButton = requireElement<HTMLButtonElement>("#play");
const statusElement = requireElement<HTMLSpanElement>("#status");
const stopButton = requireElement<HTMLButtonElement>("#stop");

const dispose = createRoot(disposeRoot => {
  const player = createRLottie({
    loop: true,
    autoplay: true,
    source: SOURCE,
    visibility: "ignore",
  });

  const pause = () => {
    player.pause();
  };

  const play = () => {
    player.play();
  };

  const stop = () => {
    player.stop();
  };

  player.canvasRef(canvas);
  pauseButton.addEventListener("click", pause);
  playButton.addEventListener("click", play);
  stopButton.addEventListener("click", stop);

  createEffect(() => {
    statusElement.textContent = `Status: ${player.status()}`;
    errorElement.textContent = player.error()?.message ?? "";
  });

  onCleanup(() => {
    pauseButton.removeEventListener("click", pause);
    playButton.removeEventListener("click", play);
    stopButton.removeEventListener("click", stop);
  });

  return disposeRoot;
});

window.addEventListener("pagehide", dispose, { once: true });

import type { PlayerEventController } from "#core/player/player-event-controller";
import { seekToTime } from "#core/player/timeline";
import type {
  EnvironmentState,
  PlayerPlaybackCallbacks,
  RLottieSeekTarget,
} from "#core/types/index";

export class PlayerPlaybackController {
  readonly #callbacks: PlayerPlaybackCallbacks;
  readonly #events: PlayerEventController;
  #imperativePlaying: boolean;

  public constructor(
    autoplay: boolean,
    events: PlayerEventController,
    callbacks: PlayerPlaybackCallbacks,
  ) {
    this.#imperativePlaying = autoplay;
    this.#events = events;
    this.#callbacks = callbacks;
  }

  public applyDesired(): void {
    if (this.#callbacks.getMetadata() === null) {
      return;
    }

    const options = this.#callbacks.getOptions();
    const shouldPlay = options.playing ?? this.#imperativePlaying;

    this.#callbacks.post({
      playerId: this.#callbacks.playerId,
      type: shouldPlay ? "play" : "pause",
    });
    this.#callbacks.onStatus(shouldPlay ? "playing" : "paused", null);
  }

  public applyGate(state: EnvironmentState): void {
    const options = this.#callbacks.getOptions();
    const visible = state.documentVisible && state.intersectionVisible;
    const interactionAllows = !options.playOnHover || state.hovered;
    const ignoreVisibility = options.visibility === "ignore";
    const catchUp = options.visibility === "catch-up";

    this.#callbacks.post({
      type: "gate",
      playerId: this.#callbacks.playerId,
      render: (ignoreVisibility || visible) && interactionAllows,
      timeline: interactionAllows && (ignoreVisibility || catchUp || visible),
    });
  }

  public pause(): void {
    this.#imperativePlaying = false;
    this.#callbacks.post({ type: "pause", playerId: this.#callbacks.playerId });
    this.#callbacks.onStatus("paused", null);
  }

  public play(): void {
    this.#imperativePlaying = true;
    this.applyDesired();
  }

  public seek(target: RLottieSeekTarget): void {
    const metadata = this.#callbacks.getMetadata();

    if (metadata === null) {
      return;
    }

    const time = seekToTime(target, metadata);

    this.#events.setCurrentTime(time);
    this.#callbacks.post({ time, type: "seek", playerId: this.#callbacks.playerId });
  }

  public stop(): void {
    this.#imperativePlaying = false;
    this.#callbacks.post({ type: "stop", playerId: this.#callbacks.playerId });
    this.#events.resetPosition();
    this.#callbacks.onStatus("stopped", null);
  }
}

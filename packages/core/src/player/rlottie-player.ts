import { RLottieError } from "#core/errors/rlottie-error";
import { CanvasPresenter } from "#core/player/canvas-presenter";
import { EMPTY_QUALITY, resolveOptions } from "#core/player/defaults";
import { PlayerEnvironment } from "#core/player/player-environment";
import { PlayerEventController } from "#core/player/player-event-controller";
import { PlayerPlaybackController } from "#core/player/player-playback-controller";
import { PlayerRenderController } from "#core/player/player-render-controller";
import { PlayerSourceController } from "#core/player/player-source-controller";
import { sameQualitySnapshot } from "#core/player/same-quality-snapshot";
import { sameResolvedOptions } from "#core/player/same-resolved-options";
import { canTransition } from "#core/player/state-machine";
import { getDefaultSourceLoader } from "#core/sources/default-source-loader";
import { sameSource } from "#core/sources/same-source";
import { ExternalStore } from "#core/store/external-store";
import type {
  LoadedSource,
  LottieSource,
  PlayerDependencies,
  ResolvedOptions,
  RLottieDiagnostics,
  RLottieListener,
  RLottieMetadata,
  RLottieOptions,
  RLottieSeekTarget,
  RLottieSnapshot,
  RLottieStatus,
} from "#core/types/index";
import { isCanvas } from "#core/utils/is-canvas";
import { WorkerBridge } from "#core/workers/worker-bridge";

let nextPlayerId = 1;

/** Public framework-agnostic RLottie player. */
export class RLottiePlayer {
  readonly #bridge: WorkerBridge;
  #destroyed = false;
  readonly #environment: PlayerEnvironment;
  readonly #events: PlayerEventController;
  readonly #id = `rlottie-player-${String(nextPlayerId++)}`;
  #metadata: RLottieMetadata | null = null;
  #options: ResolvedOptions;
  readonly #playback: PlayerPlaybackController;
  readonly #presenter: CanvasPresenter;
  #rawOptions: RLottieOptions;
  readonly #render: PlayerRenderController;
  #source: LottieSource | undefined;
  readonly #sourceController: PlayerSourceController;
  readonly #store: ExternalStore;

  public constructor(
    canvas: HTMLCanvasElement,
    options: RLottieOptions = {},
    dependencies: PlayerDependencies = {},
  ) {
    if (!isCanvas(canvas)) {
      throw new RLottieError("CANVAS_UNAVAILABLE", "RLottiePlayer requires an HTMLCanvasElement");
    }

    this.#rawOptions = options;
    this.#options = resolveOptions(options);
    this.#source = options.source;
    this.#store = new ExternalStore({
      error: null,
      metadata: null,
      status: "idle",
      quality: EMPTY_QUALITY,
    });
    this.#presenter = new CanvasPresenter(canvas, error => {
      this.#setStatus("error", error);
    });
    this.#bridge = new WorkerBridge(this.#id, () => this.#presenter.takeOffscreenCanvas(), {
      onEvent: event => {
        this.#events.handle(event);
      },
    });
    this.#render = new PlayerRenderController(canvas, {
      playerId: this.#id,
      getOptions: () => this.#options,
      getMetadata: () => this.#metadata,
      post: message => {
        this.#bridge.post(message);
      },
      publishQuality: quality => {
        if (!sameQualitySnapshot(this.#store.getSnapshot().quality, quality)) {
          this.#publish({ quality });
        }
      },
    });
    this.#events = new PlayerEventController({
      onError: error => {
        this.#setStatus("error", error);
      },
      onBitmap: bitmap => {
        this.#presenter.present(bitmap);
      },
      onDiagnostics: diagnostics => {
        this.#handleDiagnostics(diagnostics);
      },
      onStatus: status => {
        if (status !== this.#store.getSnapshot().status) {
          this.#setStatus(status, null);
        }
      },
    });
    this.#playback = new PlayerPlaybackController(this.#options.autoplay, this.#events, {
      playerId: this.#id,
      getOptions: () => this.#options,
      getMetadata: () => this.#metadata,
      post: message => {
        this.#bridge.post(message);
      },
      onStatus: (status, error) => {
        this.#setStatus(status, error);
      },
    });
    this.#environment = new PlayerEnvironment(canvas, {
      onResize: this.#resize,
      onGateChange: state => {
        this.#playback.applyGate(state);
      },
    });
    this.#sourceController = new PlayerSourceController(
      dependencies.sourceLoader ?? getDefaultSourceLoader(),
      {
        onLoaded: this.#onSourceLoaded,
        onStatus: (status, error) => {
          this.#setStatus(status, error);
        },
      },
    );
    this.#environment.updateResponsiveRules(this.#options.responsive);

    if (options.source !== undefined) {
      void this.load(options.source);
    }
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#sourceController.destroy();
    this.#environment.destroy();
    this.#bridge.destroy();
    this.#presenter.destroy();
    this.#publish({ error: null, status: "destroyed" });
    this.#store.clear();
    this.#events.clear();
  }

  public getCurrentFrame = (): number => this.#events.currentFrame;

  public getCurrentTime = (): number => this.#events.currentTime;

  public getProgress(): number {
    if (this.#metadata === null || this.#metadata.duration === 0) {
      return 0;
    }

    return Math.min(1, this.#events.currentTime / this.#metadata.duration);
  }

  public getSnapshot = (): RLottieSnapshot => this.#store.getSnapshot();

  public async load(source: LottieSource): Promise<RLottieMetadata> {
    this.#assertAlive();
    this.#source = source;

    return this.#sourceController.load(source);
  }

  public pause(): void {
    this.#assertAlive();
    this.#playback.pause();
  }

  public play(): void {
    this.#assertAlive();
    this.#playback.play();
  }

  public seek(target: RLottieSeekTarget): void {
    this.#assertAlive();
    this.#playback.seek(target);
  }

  public setPlaybackRate(playbackRate: number): void {
    this.updateOptions({ playbackRate });
  }

  public async start(source: LottieSource): Promise<RLottieMetadata> {
    const metadata = await this.load(source);

    this.play();

    return metadata;
  }

  public stop(): void {
    this.#assertAlive();
    this.#playback.stop();
  }

  public subscribe = (listener: RLottieListener): (() => void) => this.#store.subscribe(listener);

  public subscribeDiagnostics = (listener: (value: RLottieDiagnostics) => void): (() => void) =>
    this.#events.subscribeDiagnostics(listener);

  public subscribeFrame = (listener: RLottieListener) => this.#events.subscribeFrame(listener);

  public updateOptions(patch: Partial<RLottieOptions>): void {
    this.#assertAlive();

    const previousSource = this.#source;
    const nextRawOptions = { ...this.#rawOptions, ...patch };
    const nextOptions = resolveOptions(nextRawOptions);
    const sourceChanged = patch.source !== undefined && !sameSource(previousSource, patch.source);

    if (sameResolvedOptions(this.#options, nextOptions) && !sourceChanged) {
      return;
    }

    this.#rawOptions = nextRawOptions;
    this.#options = nextOptions;
    this.#render.reset();
    this.#environment.updateResponsiveRules(this.#options.responsive);
    this.#bridge.post({
      type: "update",
      playerId: this.#id,
      options: this.#render.workerOptions(),
    });
    this.#resize();
    this.#playback.applyDesired();
    this.#playback.applyGate(this.#environment.state);

    if (sourceChanged && patch.source !== undefined) {
      this.#source = patch.source;
      void this.load(patch.source).catch(() => undefined);
    }
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new RLottieError("PLAYER_DESTROYED", "The RLottie player has been destroyed");
    }
  }

  #handleDiagnostics(diagnostics: Parameters<PlayerRenderController["sample"]>[0]): void {
    if (!this.#render.sample(diagnostics)) {
      return;
    }

    this.#bridge.post({
      type: "update",
      playerId: this.#id,
      options: this.#render.workerOptions(),
    });
    this.#resize();
  }

  readonly #onSourceLoaded = async (loaded: LoadedSource): Promise<void> => {
    this.#metadata = loaded.metadata;
    this.#render.resetQuality();

    await this.#bridge.load({
      ...this.#resize(),
      json: loaded.json,
      metadata: loaded.metadata,
      sourceBytes: loaded.bytes,
      ...(loaded.sourceKey === undefined ? {} : { sourceKey: loaded.sourceKey }),
      options: this.#render.workerOptions(),
      posterFrame: this.#options.posterFrame,
    });
    this.#publish({ status: "ready", metadata: loaded.metadata });
    this.#playback.applyDesired();
    this.#playback.applyGate(this.#environment.state);
  };

  #publish(patch: Partial<RLottieSnapshot>): void {
    this.#store.publish({ ...this.#store.getSnapshot(), ...patch });
  }

  readonly #resize = () => {
    const size = this.#render.resize();

    this.#presenter.resize(size.width, size.height);

    return size;
  };

  #setStatus(status: RLottieStatus, error: RLottieError | null): void {
    if (canTransition(this.#store.getSnapshot().status, status)) {
      this.#publish({ error, status });
    }
  }
}

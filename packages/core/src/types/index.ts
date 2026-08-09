import type { RLottieError } from "#core/errors/rlottie-error";

/** Identifies where an animation source is located. */
export enum Format {
  Local = 0,
  URL = 1,
}

/** Identifies how an animation source is encoded. */
export enum Type {
  JSON = 0,
  TGS = 1,
}

export type AdaptiveQualityReason = "base" | "adaptive-pressure" | "adaptive-recovery";
export type FitMode = "contain" | "cover" | "fill";
export type FrameRate = "source" | number;
export type PixelRatio = "device" | number;
export type RenderPath = "offscreen-direct" | "image-bitmap";
export type RenderResolution = "auto" | Size;
export type RLottieErrorCode =
  | "WASM_LOAD_FAILED"
  | "WASM_INIT_FAILED"
  | "SOURCE_ABORTED"
  | "SOURCE_FETCH_FAILED"
  | "SOURCE_TOO_LARGE"
  | "SOURCE_INVALID_GZIP"
  | "SOURCE_INVALID_UTF8"
  | "SOURCE_INVALID_JSON"
  | "RLOTTIE_PARSE_FAILED"
  | "CANVAS_UNAVAILABLE"
  | "OFFSCREEN_TRANSFER_FAILED"
  | "RENDER_SIZE_EXCEEDED"
  | "RENDER_FAILED"
  | "PLAYER_DESTROYED";
export type RLottieListener = () => void;
export type RLottieSeekTarget = { frame: number } | { progress: number } | { time: number };
export type RLottieStatus =
  | "idle"
  | "initializing"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "stopped"
  | "completed"
  | "error"
  | "destroyed";
export type VisibilityMode = "pause" | "catch-up" | "ignore";

export interface AdaptiveQualityOptions {
  allowFpsReduction?: boolean;
  enabled?: boolean;
  minFps?: number;
  minResolutionScale?: number;
  step?: number;
}

export interface AdaptiveQualityState {
  fps: number;
  reason: AdaptiveQualityReason;
  scale: number;
}

export interface BaselineAnimation extends NativeAnimation {
  load(json: string): boolean;
}

export interface BaselineModule {
  RlottieWasm: new () => BaselineAnimation;
}

export interface CApiModule {
  HEAPU8: Uint8Array;
  _animation_create_from_json(jsonPointer: number): number;
  _animation_destroy(handle: number): void;
  _animation_render(handle: number, frame: number, width: number, height: number): number;
  _free(pointer: number): void;
  _malloc(bytes: number): number;
  lengthBytesUTF8(value: string): number;
  stringToUTF8(value: string, pointer: number, maximumBytes: number): void;
}

export type CacheEntry = LoadedSource;

export interface CanvasPresenterCallbacks {
  onError(error: RLottieError): void;
}

export interface EnvironmentControllerCallbacks {
  onGateChange(state: EnvironmentState): void;
  onResize(): void;
}

export interface EnvironmentState {
  documentVisible: boolean;
  hovered: boolean;
  intersectionVisible: boolean;
}

export interface LoadedSource {
  bytes: number;
  json: string;
  metadata: RLottieMetadata;
  sourceKey?: string;
}

export interface NativeAnimation {
  delete(): void;
  render(frame: number, width: number, height: number): Uint8Array;
}

export interface NativeAnimationLease {
  readonly animation: NativeAnimation;
  destroy(): void;
}

export interface NativeFactory {
  create(json: string): NativeAnimation;
}

export interface PendingEntry {
  abortTimer: ReturnType<typeof setTimeout> | undefined;
  consumers: number;
  controller: AbortController;
  settled: boolean;
  task: Promise<LoadedSource>;
}

export interface PendingRequest {
  reject(error: unknown): void;
  resolve(): void;
}

export interface PlayerDependencies {
  sourceLoader?: SourceLoaderContract;
}

export interface PlayerEventCallbacks {
  onBitmap(bitmap: ImageBitmap): void;
  onDiagnostics(diagnostics: RLottieDiagnostics): void;
  onError(error: RLottieError): void;
  onStatus(status: RLottieStatus): void;
}

export interface PlayerPlaybackCallbacks {
  getMetadata(): RLottieMetadata | null;
  getOptions(): ResolvedOptions;
  onStatus(status: RLottieStatus, error: RLottieError | null): void;
  playerId: string;
  post(message: WorkerRequest): void;
}

export interface PlayerEnvironmentCallbacks {
  onGateChange(state: EnvironmentState): void;
  onResize(): void;
}

export interface PlayerRenderCallbacks {
  getMetadata(): RLottieMetadata | null;
  getOptions(): ResolvedOptions;
  playerId: string;
  post(message: WorkerRequest): void;
  publishQuality(quality: RLottieQualitySnapshot): void;
}

export interface PlayerSourceCallbacks {
  onLoaded(loaded: LoadedSource): Promise<void>;
  onStatus(status: RLottieStatus, error: RLottieError | null): void;
}

export interface QualityTelemetry {
  droppedRatio: number;
  renderBudgetRatio: number;
  workerUtilization: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export interface SessionRenderPlan {
  frame: number;
  groupKey: string;
  playerId: string;
  rect: Rect;
  shape: "fill" | "preserve-aspect";
}

export interface SessionRenderGroup extends Size {
  plans: SessionRenderPlan[];
}

export interface SharedFrameSession {
  presentShared(plan: SessionRenderPlan, frame: OffscreenCanvas): void;
  recordRender(duration: number): void;
  renderNative(frame: number, width: number, height: number): Uint8Array;
  renderPlanned(plan: SessionRenderPlan): void;
}

export interface RenderProfile {
  fps?: FrameRate;
  frameStep?: number;
  maxPixelRatio?: number;
  maxRenderPixels?: number;
  pixelRatio?: PixelRatio;
  resolutionScale?: number;
  resolution?: RenderResolution;
}

export interface ResolvedOptions {
  adaptiveQuality: Required<AdaptiveQualityOptions>;
  autoplay: boolean;
  direction: 1 | -1;
  fit: FitMode;
  fps: FrameRate;
  frameStep: number;
  loop: boolean | number;
  maxPixelRatio: number;
  maxRenderPixels: number;
  pixelRatio: PixelRatio;
  playing: boolean | undefined;
  playOnHover: boolean;
  playbackRate: number;
  posterFrame: number;
  resolution: RenderResolution;
  resolutionScale: number;
  responsive: ResponsiveRule[];
  visibility: VisibilityMode;
}

export type ResolvedBehaviorOptions = Pick<
  ResolvedOptions,
  "autoplay" | "playing" | "playOnHover" | "responsive" | "visibility"
>;
export type ResolvedPlaybackOptions = Pick<
  ResolvedOptions,
  "direction" | "fit" | "fps" | "frameStep" | "loop" | "playbackRate" | "posterFrame"
>;
export type ResolvedRenderingOptions = Pick<
  ResolvedOptions,
  "maxPixelRatio" | "maxRenderPixels" | "pixelRatio" | "resolution" | "resolutionScale"
>;

export type ResolvedRenderProfile = Required<RenderProfile>;

export interface ResponsiveRule extends RenderProfile {
  when: {
    maxCanvasWidth?: number;
    media?: string;
    minCanvasWidth?: number;
  };
}

export interface RLottieDiagnostics {
  /** Target render slots skipped during this sample window. */
  droppedFrames: number;
  queueDepth: 0 | 1;
  renderAverageMs: number;
  /** Frames completed during this sample window. */
  renderedFrames: number;
  /** Completed renders per second during this sample window. */
  renderedFps: number;
  renderPath: RenderPath | "main-thread";
  workerId: number;
}

export interface RLottieMetadata {
  duration: number;
  frameRate: number;
  height: number;
  totalFrames: number;
  width: number;
}

export interface RLottieOptions extends RenderProfile {
  adaptiveQuality?: boolean | AdaptiveQualityOptions;
  autoplay?: boolean;
  direction?: 1 | -1;
  fit?: FitMode;
  loop?: boolean | number;
  playing?: boolean;
  playOnHover?: boolean;
  playbackRate?: number;
  posterFrame?: number;
  responsive?: ResponsiveRule[];
  source?: LottieSource;
  visibility?: VisibilityMode;
}

export interface RLottieQualitySnapshot {
  adaptiveResolutionScale: number;
  effectiveFps: number;
  effectiveFrameStep: number;
  effectiveResolutionScale: number;
  reason: AdaptiveQualityReason | "responsive";
  resolution: Size;
}

export interface RLottieSnapshot {
  error: RLottieError | null;
  metadata: RLottieMetadata | null;
  quality: RLottieQualitySnapshot;
  status: RLottieStatus;
}

export interface Size {
  height: number;
  width: number;
}

export interface SourceLoaderContract {
  load(source: LottieSource, signal: AbortSignal): Promise<LoadedSource>;
}

export interface SourceDeliveryEntry {
  loaded: LoadedSource;
  reject(error: unknown): void;
  resolve(loaded: LoadedSource): void;
  signal: AbortSignal;
}

export interface SourceLoaderOptions {
  cacheBudget?: number;
  sourceLimit?: number;
}

export type SourceLoaderRegistryHost = typeof globalThis &
  Record<symbol, SourceLoaderContract | undefined>;

export interface WorkerLease {
  destroy(): void;
  post(message: WorkerRequest, transfer?: Transferable[]): void;
}

export interface WorkerBridgeCallbacks {
  onEvent(event: WorkerEvent): void;
}

export interface WorkerLoadPayload {
  height: number;
  json: string;
  metadata: RLottieMetadata;
  options: WorkerPlaybackOptions;
  posterFrame: number;
  sourceBytes: number;
  sourceKey?: string;
  width: number;
}

export interface WorkerPoolContract {
  assign(
    playerId: string,
    onEvent: (event: WorkerEvent) => void,
    affinityKey?: string,
  ): WorkerLease;
  destroy(): void;
  scheduleIdleDestroy(callback: () => void): void;
}

export interface WorkerAffinityCohort {
  connection: WorkerConnectionContract;
  references: number;
}

export interface WorkerAffinityGroup {
  cohorts: WorkerAffinityCohort[];
}

export interface WorkerAnimationEntry {
  animation: NativeAnimation;
  references: number;
}

export interface WorkerConnectionContract {
  assign(
    playerId: string,
    callback: (event: WorkerEvent) => void,
    renderPhase?: number,
  ): WorkerLease;
  readonly playerCount: number;
}

export interface WorkerPoolRegistryRecord {
  pool: WorkerPoolContract;
  references: number;
}

export interface WorkerSourceCacheEntry {
  bytes: number;
  json: string;
}

export type WorkerRegistryHost = typeof globalThis &
  Record<symbol, WorkerPoolRegistryRecord | undefined>;

export interface WorkerPlaybackOptions {
  direction: 1 | -1;
  fit: FitMode;
  fps: number;
  frameStep: number;
  loop: boolean | number;
  playbackRate: number;
}

export type LocalJsonLottieSource = {
  cacheKey?: string;
  format: Format.Local;
  json: string | Record<string, unknown>;
  type: Type.JSON;
};
export type LocalTgsLottieSource = {
  binary: ArrayBuffer | Uint8Array | Blob | File;
  cacheKey?: string;
  format: Format.Local;
  type: Type.TGS;
};
export type UrlLottieSource = {
  cacheKey?: string;
  fetchOptions?: RequestInit;
  format: Format.URL;
  type: Type.JSON | Type.TGS;
  url: string;
};
export type LocalLottieSource = LocalJsonLottieSource | LocalTgsLottieSource;
export type LottieSource = LocalLottieSource | UrlLottieSource;

export type WorkerEvent =
  | {
      playerId: string;
      renderPath: RenderPath;
      requestId: number;
      type: "created";
    }
  | { bitmap: ImageBitmap; playerId: string; type: "bitmap" }
  | {
      currentFrame: number;
      currentTime: number;
      playerId: string;
      status: RLottieStatus;
      type: "state";
    }
  | { diagnostics: RLottieDiagnostics; playerId: string; type: "diagnostics" }
  | { code: string; message: string; playerId: string; requestId?: number; type: "error" };

export type WorkerRequest =
  | {
      canvas?: OffscreenCanvas;
      height: number;
      json: string | undefined;
      metadata: RLottieMetadata;
      options: WorkerPlaybackOptions;
      playerId: string;
      posterFrame: number;
      requestId: number;
      renderPhase: number;
      sourceBytes: number;
      sourceKey?: string;
      type: "create";
      width: number;
      workerId: number;
    }
  | {
      json: string | undefined;
      metadata: RLottieMetadata;
      options: WorkerPlaybackOptions;
      playerId: string;
      posterFrame: number;
      requestId: number;
      sourceBytes: number;
      sourceKey?: string;
      type: "reload";
    }
  | { playerId: string; type: "destroy" }
  | { playerId: string; type: "pause" | "play" | "stop" }
  | { playerId: string; time: number; type: "seek" }
  | { fit: FitMode; height: number; playerId: string; type: "resize"; width: number }
  | { options: WorkerPlaybackOptions; playerId: string; type: "update" }
  | { playerId: string; render: boolean; timeline: boolean; type: "gate" };

export type CreateWorkerRequest = Extract<WorkerRequest, { type: "create" }>;
export type ReloadWorkerRequest = Extract<WorkerRequest, { type: "reload" }>;
export type WasmModuleFactory = (options: { locateFile(path: string): string }) => Promise<unknown>;

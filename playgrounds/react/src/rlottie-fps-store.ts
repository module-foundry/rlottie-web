import type { RLottieDiagnostics } from "@module-foundry/rlottie-web";

const PUBLISH_INTERVAL_MS = 1_000;
const SAMPLE_COHORT_DELAY_MS = 50;
const PERCENTILE_95 = 0.95;
const PERCENT_SCALE = 100;

export class RLottieFpsStore {
  #lastPublishedAt = performance.now();
  readonly #listeners = new Set<() => void>();
  readonly #samples = new Map<number, RLottieDiagnostics>();
  #snapshot = "Measuring…";
  #timer: ReturnType<typeof setTimeout> | undefined;

  public destroy(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }

    this.#listeners.clear();
    this.#samples.clear();
  }

  public getSnapshot = (): string => this.#snapshot;

  public record(playerId: number, diagnostics: RLottieDiagnostics): void {
    this.#samples.set(playerId, diagnostics);

    if (this.#timer !== undefined) {
      return;
    }

    const now = performance.now();
    const untilNextWindow = Math.max(0, PUBLISH_INTERVAL_MS - (now - this.#lastPublishedAt));

    this.#timer = setTimeout(this.#publish, Math.max(SAMPLE_COHORT_DELAY_MS, untilNextWindow));
  }

  public remove(playerId: number): void {
    this.#samples.delete(playerId);
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  };

  readonly #publish = (): void => {
    this.#timer = undefined;
    this.#lastPublishedAt = performance.now();

    const values = [...this.#samples.values()]
      .map(diagnostics => diagnostics.renderedFps)
      .sort((left, right) => left - right);

    if (values.length === 0) {
      return;
    }

    const minimum = values[0] ?? 0;
    const average = values.reduce((total, value) => total + value, 0) / values.length;
    const percentileIndex = Math.max(0, Math.ceil(values.length * PERCENTILE_95) - 1);
    const percentile95 = values[percentileIndex] ?? 0;
    const workerLoads = new Map<number, number>();

    for (const diagnostics of this.#samples.values()) {
      const renderLoad =
        (diagnostics.renderAverageMs * diagnostics.renderedFps) / PUBLISH_INTERVAL_MS;

      workerLoads.set(
        diagnostics.workerId,
        (workerLoads.get(diagnostics.workerId) ?? 0) + renderLoad,
      );
    }

    const maximumWorkerLoad = Math.max(0, ...workerLoads.values());

    this.#snapshot = `${String(Math.round(minimum))} / ${String(Math.round(average))} / ${String(
      Math.round(percentile95),
    )} · ${String(workerLoads.size)}W · ${String(Math.round(maximumWorkerLoad * PERCENT_SCALE))}%`;

    for (const listener of this.#listeners) {
      listener();
    }
  };
}

import { PLAYERS_PER_WORKER_BEFORE_SCALE, WORKER_IDLE_TIMEOUT_MS } from "#core/constants/index";
import type { WorkerEvent, WorkerLease } from "#core/types/index";
import { WorkerConnection } from "#core/workers/worker-connection";

export class WorkerPool {
  readonly #connections: WorkerConnection[] = [];
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #maxWorkers: number;
  #nextWorkerId = 1;

  public constructor(maxWorkers: number) {
    this.#maxWorkers = maxWorkers;
  }

  public assign(playerId: string, onEvent: (event: WorkerEvent) => void): WorkerLease {
    this.#cancelIdleDestroy();

    let connection = this.#leastLoaded();

    if (connection === undefined) {
      return this.#createConnection().assign(playerId, onEvent);
    }

    if (
      connection.playerCount >= PLAYERS_PER_WORKER_BEFORE_SCALE &&
      this.#connections.length < this.#maxWorkers
    ) {
      connection = this.#createConnection();
    }

    return connection.assign(playerId, onEvent);
  }

  public destroy(): void {
    this.#cancelIdleDestroy();

    for (const connection of this.#connections) {
      connection.destroy();
    }

    this.#connections.length = 0;
  }

  public scheduleIdleDestroy(callback: () => void): void {
    this.#cancelIdleDestroy();
    this.#idleTimer = setTimeout(callback, WORKER_IDLE_TIMEOUT_MS);
  }

  #cancelIdleDestroy(): void {
    if (this.#idleTimer === undefined) {
      return;
    }

    clearTimeout(this.#idleTimer);
    this.#idleTimer = undefined;
  }

  #createConnection(): WorkerConnection {
    const connection = new WorkerConnection(this.#nextWorkerId);

    this.#nextWorkerId += 1;
    this.#connections.push(connection);

    return connection;
  }

  #leastLoaded(): WorkerConnection | undefined {
    let selected: WorkerConnection | undefined;

    for (const connection of this.#connections) {
      if (selected === undefined || connection.playerCount < selected.playerCount) {
        selected = connection;
      }
    }

    return selected;
  }
}

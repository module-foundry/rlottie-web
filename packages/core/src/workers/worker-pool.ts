import {
  PLAYERS_PER_SHARED_RENDER_COHORT,
  PLAYERS_PER_WORKER_BEFORE_SCALE,
  WORKER_IDLE_TIMEOUT_MS,
} from "#core/constants/index";
import type {
  WorkerAffinityCohort,
  WorkerAffinityGroup,
  WorkerEvent,
  WorkerLease,
} from "#core/types/index";
import { WorkerConnection } from "#core/workers/worker-connection";

export class WorkerPool {
  readonly #affinities = new Map<string, WorkerAffinityGroup>();
  readonly #connections: WorkerConnection[] = [];
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #maxWorkers: number;
  #nextWorkerId = 1;

  public constructor(maxWorkers: number) {
    this.#maxWorkers = maxWorkers;
  }

  public assign(
    playerId: string,
    onEvent: (event: WorkerEvent) => void,
    affinityKey?: string,
  ): WorkerLease {
    this.#cancelIdleDestroy();

    if (affinityKey !== undefined) {
      return this.#assignAffinity(playerId, onEvent, affinityKey);
    }

    let connection = this.#leastLoaded();

    if (connection === undefined) {
      connection = this.#createConnection();
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
    this.#affinities.clear();
  }

  public scheduleIdleDestroy(callback: () => void): void {
    this.#cancelIdleDestroy();
    this.#idleTimer = setTimeout(callback, WORKER_IDLE_TIMEOUT_MS);
  }

  #assignAffinity(
    playerId: string,
    onEvent: (event: WorkerEvent) => void,
    affinityKey: string,
  ): WorkerLease {
    const group = this.#affinities.get(affinityKey) ?? { cohorts: [] };
    let cohort = this.#leastPopulatedCohort(group);

    if (cohort === undefined || cohort.references >= PLAYERS_PER_SHARED_RENDER_COHORT) {
      const connection = this.#connectionForNewCohort(group);

      if (connection !== undefined) {
        cohort = { connection, references: 0 };
        group.cohorts.push(cohort);
      }
    }

    if (cohort === undefined) {
      const connection = this.#createConnection();

      cohort = { connection, references: 0 };
      group.cohorts.push(cohort);
    }

    this.#affinities.set(affinityKey, group);
    cohort.references += 1;

    return this.#withAffinityRelease(
      cohort.connection.assign(playerId, onEvent, 0),
      affinityKey,
      cohort,
    );
  }

  #cancelIdleDestroy(): void {
    if (this.#idleTimer === undefined) {
      return;
    }

    clearTimeout(this.#idleTimer);
    this.#idleTimer = undefined;
  }

  #connectionForNewCohort(group: WorkerAffinityGroup): WorkerConnection | undefined {
    let selected: WorkerConnection | undefined;

    for (const connection of this.#connections) {
      if (group.cohorts.some(cohort => cohort.connection === connection)) {
        continue;
      }

      if (selected === undefined || connection.playerCount < selected.playerCount) {
        selected = connection;
      }
    }

    if (selected !== undefined) {
      return selected;
    }

    return this.#connections.length < this.#maxWorkers ? this.#createConnection() : undefined;
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

  #leastPopulatedCohort(group: WorkerAffinityGroup): WorkerAffinityCohort | undefined {
    let selected: WorkerAffinityCohort | undefined;

    for (const cohort of group.cohorts) {
      if (selected === undefined || cohort.references < selected.references) {
        selected = cohort;
      }
    }

    return selected;
  }

  #withAffinityRelease(
    lease: WorkerLease,
    affinityKey: string,
    cohort: WorkerAffinityCohort,
  ): WorkerLease {
    let destroyed = false;

    return {
      post: (message, transfer) => {
        lease.post(message, transfer);
      },
      destroy: () => {
        if (destroyed) {
          return;
        }

        destroyed = true;
        lease.destroy();

        const group = this.#affinities.get(affinityKey);

        if (group === undefined || !group.cohorts.includes(cohort)) {
          return;
        }

        cohort.references -= 1;

        if (cohort.references === 0) {
          group.cohorts.splice(group.cohorts.indexOf(cohort), 1);
        }

        if (group.cohorts.length === 0) {
          this.#affinities.delete(affinityKey);
        }
      },
    };
  }
}

export class WorkerTaskScheduler {
  #callback: (() => void) | undefined;
  #channel: MessageChannel | undefined;
  #generation = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;

  public cancel(): void {
    this.#cancelPending();
    this.#generation += 1;

    if (this.#channel === undefined) {
      return;
    }

    this.#channel.port1.removeEventListener("message", this.#onMessage);
    this.#channel.port1.close();
    this.#channel.port2.close();
    this.#channel = undefined;
  }

  public schedule(callback: () => void, delay: number): void {
    this.#cancelPending();
    this.#callback = callback;
    this.#generation += 1;

    if (delay > 0) {
      this.#timer = setTimeout(this.#run, delay);

      return;
    }

    this.#ensureChannel().port2.postMessage(this.#generation);
  }

  #cancelPending(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }

    this.#callback = undefined;
  }

  #ensureChannel(): MessageChannel {
    if (this.#channel !== undefined) {
      return this.#channel;
    }

    const channel = new MessageChannel();

    channel.port1.addEventListener("message", this.#onMessage);
    channel.port1.start();
    this.#channel = channel;

    return channel;
  }

  readonly #onMessage = (event: MessageEvent<unknown>): void => {
    if (event.data !== this.#generation) {
      return;
    }

    this.#run();
  };

  readonly #run = (): void => {
    this.#timer = undefined;

    const callback = this.#callback;

    this.#callback = undefined;
    callback?.();
  };
}

const MILLISECONDS_PER_SECOND = 1_000;

export const createFpsMeter = (
  sampleCount: number,
  publish: (sample: { instant: number; smoothed: number }) => void,
): (() => void) => {
  const samples: number[] = [];
  let frame: number | undefined;
  let lastTime: number | undefined;

  const loop = (time: number): void => {
    if (lastTime !== undefined) {
      const instant = MILLISECONDS_PER_SECOND / (time - lastTime);

      samples.push(instant);

      if (samples.length > sampleCount) {
        samples.shift();
      }

      const smoothed = samples.reduce((total, sample) => total + sample, 0) / samples.length;

      publish({ instant, smoothed });
    }

    lastTime = time;
    frame = requestAnimationFrame(loop);
  };

  frame = requestAnimationFrame(loop);

  return () => {
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
    }
  };
};

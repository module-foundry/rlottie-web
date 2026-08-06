export const countSkippedSourceFrames = (
  previousFrame: number,
  desiredFrame: number,
  totalFrames: number,
  direction: 1 | -1,
  frameStep: number,
): number => {
  if (previousFrame < 0 || totalFrames <= 1) {
    return 0;
  }

  const distance =
    direction === 1
      ? (desiredFrame - previousFrame + totalFrames) % totalFrames
      : (previousFrame - desiredFrame + totalFrames) % totalFrames;
  const transitions = Math.ceil(distance / Math.max(1, frameStep));

  return Math.max(0, transitions - 1);
};

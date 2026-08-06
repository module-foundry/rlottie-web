export const clamp = (value: number, minimum: number, maximum: number): number => {
  if (!Number.isFinite(value)) {
    throw new RangeError("value must be finite");
  }

  return Math.min(maximum, Math.max(minimum, value));
};

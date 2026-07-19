export function dragStepsFromDistance(distance, pitch, threshold) {
  if (Math.abs(distance) <= threshold) return 0;
  const rounded = Math.round(distance / pitch);
  return rounded === 0 ? Math.sign(distance) : rounded;
}

export function advanceDragShift({
  distance,
  pitch,
  threshold,
  lastShift,
  blockedDirection = 0,
  applyShift,
  blockedOffsetLimit = pitch * 0.35,
}) {
  const want = dragStepsFromDistance(distance, pitch, threshold);
  const delta = want - lastShift;
  const result = delta === 0
    ? { applied: 0, moves: [] }
    : applyShift(delta);
  const nextShift = lastShift + result.applied;
  let nextBlockedDirection = blockedDirection;

  if (delta !== 0) {
    const remaining = delta - result.applied;
    nextBlockedDirection = remaining === 0 ? 0 : Math.sign(remaining);
  }

  let visualOffset = distance - nextShift * pitch;
  if (nextBlockedDirection !== 0 && visualOffset !== 0 &&
      Math.sign(visualOffset) !== nextBlockedDirection) {
    nextBlockedDirection = 0;
  }
  const constrained = nextBlockedDirection !== 0;

  if (constrained) {
    visualOffset = Math.max(
      -blockedOffsetLimit,
      Math.min(blockedOffsetLimit, visualOffset),
    );
  }

  return {
    ...result,
    lastShift: nextShift,
    blockedDirection: nextBlockedDirection,
    visualOffset,
    constrained,
  };
}

export function createDragInputLock() {
  let activePointerId = null;

  function begin(pointerId) {
    if (activePointerId !== null) return false;
    activePointerId = pointerId;
    return true;
  }

  function owns(pointerId) {
    return activePointerId === pointerId;
  }

  function release(pointerId) {
    if (!owns(pointerId)) return false;
    activePointerId = null;
    return true;
  }

  function reset() {
    activePointerId = null;
  }

  return { begin, owns, release, reset };
}

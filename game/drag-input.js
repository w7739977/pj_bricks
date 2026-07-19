export function dragStepsFromDistance(distance, pitch, threshold) {
  if (Math.abs(distance) <= threshold) return 0;
  const rounded = Math.round(distance / pitch);
  return rounded === 0 ? Math.sign(distance) : rounded;
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

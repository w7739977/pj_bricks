export function dragStepsFromDistance(distance, pitch, threshold) {
  if (Math.abs(distance) <= threshold) return 0;
  // Activation slop is separate from snapping: settle to the nearest cell.
  // Round magnitude so half-cell boundaries are symmetric in both directions.
  return Math.sign(distance) * Math.floor(Math.abs(distance) / pitch + 0.5);
}

export function advanceDragShift({
  distance,
  pitch,
  threshold,
  lastShift,
  blockedDirection = 0,
  applyShift,
  blockedOffsetLimit = pitch * 0.5,
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

// A queue belongs to one gesture; release flushes its final coordinate synchronously.
export function createDragFrameQueue({ requestFrame, cancelFrame, onMove }) {
  let frame = null;
  let latest = null;
  let generation = 0;
  function cancel() {
    generation++;
    if (frame !== null) cancelFrame(frame);
    frame = null;
    latest = null;
  }
  function push(x, y) {
    latest = { x, y };
    if (frame !== null) return;
    const owner = generation;
    frame = requestFrame(() => {
      if (owner !== generation) return;
      frame = null;
      const point = latest;
      latest = null;
      if (point) onMove(point.x, point.y);
    });
  }
  function flush(x, y) {
    cancel();
    onMove(x, y);
  }
  return { push, flush, cancel };
}

// The immutable gesture snapshot separates push-chain members from obstacles.
export function getDragOffsetBounds({ positions, axis, pitch, rows, cols, board }) {
  const indices = positions.map(p => axis === 'row' ? p.c : p.r);
  const limit = axis === 'row' ? cols : rows;
  let backward = Math.min(...indices);
  let forward = limit - 1 - Math.max(...indices);
  if (board) {
    const members = new Set(positions.map(p => `${p.r},${p.c}`));
    function freeSteps(direction, boundary) {
      for (let step = 1; step <= boundary; step++) {
        for (const p of positions) {
          const r = p.r + (axis === 'col' ? direction * step : 0);
          const c = p.c + (axis === 'row' ? direction * step : 0);
          if (!members.has(`${r},${c}`) && board[r][c] !== null) return step - 1;
        }
      }
      return boundary;
    }
    backward = freeSteps(-1, backward);
    forward = freeSteps(1, forward);
  }
  return Object.freeze({ min: -backward * pitch, max: forward * pitch });
}

export function constrainDragOffset(options) {
  const bounds = getDragOffsetBounds(options);
  return Math.max(bounds.min, Math.min(bounds.max, options.distance));
}

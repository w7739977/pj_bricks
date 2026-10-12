// Deterministic radial sparks: no per-frame JS or random layout work.
export function burstVectors(size, count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * Math.PI * 2 / count;
    const radius = size * (i % 2 === 0 ? .95 : .7);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export function createMatchBurst(cell, duration, knownSize) {
  const surface = cell.querySelector('.tile-piece');
  if (!surface || duration === 0) return;
  const size = knownSize ?? cell.getBoundingClientRect().width;
  const burst = document.createElement('span');
  burst.className = 'match-burst';
  burst.setAttribute('aria-hidden', 'true');
  burst.style.setProperty('--burst-duration', `${duration}ms`);
  const directions = [[-1,-1], [1,-1], [-1,1], [1,1]];
  directions.forEach(([x, y], i) => {
    const shard = document.createElement('span');
    shard.className = `burst-shard burst-shard--${i}`;
    shard.style.setProperty('--tx', `${x * size * .65}px`);
    shard.style.setProperty('--ty', `${y * size * .65}px`);
    shard.style.setProperty('--spin', `${x * y * 32}deg`);
    const fragment = surface.cloneNode(true);
    fragment.className = 'burst-fragment';
    fragment.removeAttribute('style');
    shard.appendChild(fragment);
    burst.appendChild(shard);
  });
  burstVectors(size).forEach(({ x, y }, i) => {
    const spark = document.createElement('i');
    spark.className = `burst-spark burst-spark--${i % 3}`;
    spark.style.setProperty('--tx', `${x}px`);
    spark.style.setProperty('--ty', `${y}px`);
    spark.style.setProperty('--spin', `${i * 37}deg`);
    burst.appendChild(spark);
  });
  cell.appendChild(burst);
  // The controller clears the effect only after the animation and its safety margin.
}


// Start on the matching frame; animationend is authoritative, timer is fallback only.
export function playMatchFeedback({ cells, duration, size, schedule, onFinish }) {
  if (duration === 0) { onFinish(); return () => {}; }
  let done = false;
  const listeners = [];
  const pending = new Set();
  function cancel() {
    done = true;
    listeners.forEach(({ surface, listener }) => surface.removeEventListener('animationend', listener));
  }
  function finish() {
    if (done) return;
    cancel();
    onFinish();
  }
  for (const cell of cells) {
    const surface = cell.querySelector('.tile-piece');
    if (surface) {
      pending.add(surface);
      const listener = event => {
        if (event.target !== surface || event.animationName !== 'tile-explode') return;
        pending.delete(surface);
        if (pending.size === 0) finish();
      };
      surface.addEventListener('animationend', listener);
      listeners.push({ surface, listener });
    }
    cell.style.setProperty('--pop-duration', `${duration}ms`);
    createMatchBurst(cell, duration, size);
    cell.classList.add('matched', 'pop');
  }
  // Hidden/background tabs and cancelled CSS animations still release controller state.
  schedule(finish, duration + 80);
  return cancel;
}

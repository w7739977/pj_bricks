// Audio is created only inside a user gesture; no network assets or timers.
export function createGameAudio() {
  let ctx, enabled = true, button, storage;
  function update() {
    if (!button) return;
    button.textContent = `音效 ${enabled ? '开' : '关'}`;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? '关闭音效' : '开启音效');
  }
  function wake() {
    if (!enabled) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      ctx ||= new Audio();
      if (ctx.state === 'suspended') ctx.resume()?.catch(() => {});
    } catch { /* Unsupported audio must never block input. */ }
  }
  function tone(hz, length = .06, delay = 0, volume = .025) {
    if (!enabled || ctx?.state !== 'running') return;
    try {
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(hz, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + .005);
      gain.gain.exponentialRampToValueAtTime(.0001, start + length);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(start + length + .01);
    } catch { /* Audio is optional. */ }
  }
  return {
    wake,
    pick: () => tone(440, .045),
    drop: () => tone(330, .045),
    block: () => tone(150, .035, 0, .012),
    match(combo = 1) {
      const base = 523.25 * 2 ** ((Math.min(5, Math.max(1, combo)) - 1) / 12);
      tone(base, .1); tone(base * 1.25, .12, .045); tone(base * 1.5, .13, .085);
    },
    suspend() { ctx?.suspend()?.catch(() => {}); },
    installToggle(el, targetStorage) {
      button = el; storage = targetStorage;
      try { enabled = storage?.getItem('pj-bricks.sound') !== 'off'; } catch {}
      update();
      button?.addEventListener('click', () => {
        enabled = !enabled;
        try { storage?.setItem('pj-bricks.sound', enabled ? 'on' : 'off'); } catch {}
        if (enabled) { wake(); tone(523, .08); } else ctx?.suspend()?.catch(() => {});
        update();
      });
    },
  };
}

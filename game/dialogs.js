// 弹框管理：基于原生 <dialog>。

const $ = (id) => document.getElementById(id);

export function showWin({ onClose } = {}) {
  const dlg = $('winDialog');
  const card = dlg.querySelector('.dialog__card');
  dlg.showModal();
  const restartBtns = dlg.querySelectorAll('[data-win-restart]');
  const closeBtn = dlg.querySelector('[data-close]');
  const listeners = [];
  const close = () => { if (dlg.open) dlg.close(); };
  const handleClose = () => { close(); onClose && onClose(); };
  restartBtns.forEach(btn => btn.addEventListener('click', () => {
    close();
    listeners.forEach(cb => cb());
  }, { once: true }));
  closeBtn.addEventListener('click', handleClose, { once: true });
  return {
    close: handleClose,
    onRestart: (cb) => listeners.push(cb),
  };
}

export function showDeadlock() {
  return new Promise((resolve) => {
    const dlg = $('deadlockDialog');
    const reshuffleBtn = dlg.querySelector('[data-deadlock-reshuffle]');
    const giveupBtn = dlg.querySelector('[data-deadlock-giveup]');
    dlg.showModal();
    const onReshuffle = () => { dlg.close(); cleanup(); resolve('reshuffle'); };
    const onGiveup = () => { dlg.close(); cleanup(); resolve('giveup'); };
    const onCancel = (e) => { e.preventDefault(); /* 阻止 Esc 关闭，强制选择 */ };
    const cleanup = () => {
      reshuffleBtn.removeEventListener('click', onReshuffle);
      giveupBtn.removeEventListener('click', onGiveup);
      dlg.removeEventListener('cancel', onCancel);
    };
    reshuffleBtn.addEventListener('click', onReshuffle, { once: true });
    giveupBtn.addEventListener('click', onGiveup, { once: true });
    dlg.addEventListener('cancel', onCancel);
  });
}

export function showGameOver(deadlockCount) {
  return new Promise((resolve) => {
    const dlg = $('gameOverDialog');
    const desc = $('gameOverDesc');
    const restartBtn = dlg.querySelector('[data-gameover-restart]');
    if (desc) desc.textContent = `本局共出现 ${deadlockCount} 次死局`;
    dlg.showModal();
    const onRestart = () => { dlg.close(); restartBtn.removeEventListener('click', onRestart); resolve(); };
    const onCancel = (e) => { e.preventDefault(); };
    restartBtn.addEventListener('click', onRestart);
    dlg.addEventListener('cancel', onCancel);
    setTimeout(() => restartBtn.focus(), 50);
  });
}
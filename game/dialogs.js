// 弹框管理：基于原生 <dialog>，每次打开只保留一组活动监听。

export function createDialogManager({ getDialog }) {
  const active = new Map();

  function closeSession(id) {
    active.get(id)?.cancel();
  }

  function open(id, closeValue, install) {
    closeSession(id);
    const dialog = getDialog(id);
    return new Promise((resolve) => {
      let settled = false;
      const cleanups = [];
      const listen = (element, type, handler) => {
        element.addEventListener(type, handler);
        cleanups.push(() => element.removeEventListener(type, handler));
      };
      const cleanup = () => cleanups.splice(0).forEach(fn => fn());
      const settle = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        active.delete(id);
        if (dialog.open) dialog.close();
        resolve(value);
      };

      listen(dialog, 'cancel', event => event.preventDefault());
      listen(dialog, 'close', () => settle(closeValue));
      install({ dialog, listen, settle });
      active.set(id, { cancel: () => settle('cancelled') });
      dialog.showModal();
    });
  }

  function closeAll() {
    [...active.keys()].forEach(closeSession);
  }

  return {
    showLevelComplete(data) {
      return open('completeDialog', 'next', ({ dialog, listen, settle }) => {
        getDialog('completeTitle').textContent = `第 ${data.levelNumber} 关完成！`;
        getDialog('completeDesc').textContent = data.unlockedIconSvg
          ? `新的水果图案已解锁：${data.unlockedIconName}`
          : '继续挑战下一关';
        getDialog('completeSummary').textContent =
          `提示剩余 ${data.hintsRemaining} · 重排剩余 ${data.reshufflesRemaining}`;
        const unlock = getDialog('completeUnlock');
        unlock.hidden = !data.unlockedIconSvg;
        unlock.innerHTML = data.unlockedIconSvg
          ? `${data.unlockedIconSvg}<span>${data.unlockedIconName}</span>`
          : '';
        const button = dialog.querySelector('[data-complete-next]');
        button.textContent = `进入第 ${data.nextLevelNumber} 关`;
        listen(button, 'click', () => settle('next'));
      });
    },

    showDeadlock() {
      return open('deadlockDialog', 'retry', ({ dialog, listen, settle }) => {
        listen(
          dialog.querySelector('[data-deadlock-retry]'),
          'click',
          () => settle('retry'),
        );
        listen(
          dialog.querySelector('[data-deadlock-reshuffle]'),
          'click',
          () => settle('reshuffle'),
        );
      });
    },

    showFailure({ title, description, actionLabel }) {
      return open('failureDialog', 'retry', ({ dialog, listen, settle }) => {
        getDialog('failureTitle').textContent = title;
        getDialog('failureDesc').textContent = description;
        const button = dialog.querySelector('[data-failure-action]');
        button.textContent = actionLabel;
        listen(button, 'click', () => settle('retry'));
      });
    },

    closeAll,
  };
}

export function createBrowserDialogManager() {
  return createDialogManager({
    getDialog: id => document.getElementById(id),
  });
}

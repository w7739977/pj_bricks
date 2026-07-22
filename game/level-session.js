export function createLevelSession({ progress, config, createNextSeed }) {
  const initial = Object.freeze({
    hints: config.hints,
    reshuffles: config.reshuffles,
  });
  const state = {
    currentLevel: progress.currentLevel,
    highestUnlocked: progress.highestUnlocked,
    levelSeed: progress.levelSeed,
    hintsRemaining: initial.hints,
    reshufflesRemaining: initial.reshuffles,
    phase: 'playing',
    failureReason: null,
  };

  const snapshot = () => Object.freeze({ ...state });

  function retry() {
    state.hintsRemaining = initial.hints;
    state.reshufflesRemaining = initial.reshuffles;
    state.phase = 'playing';
    state.failureReason = null;
    return snapshot();
  }

  function useHint({ pairAvailable }) {
    if (state.phase !== 'playing' || state.hintsRemaining === 0) {
      return { action: 'none' };
    }
    if (!pairAvailable) return { action: 'deadlock' };
    state.hintsRemaining--;
    return { action: 'highlight-pair' };
  }

  function deadlock() {
    if (state.phase !== 'playing') return { action: 'none' };
    if (state.reshufflesRemaining > 0) return { action: 'offer-reshuffle' };
    state.phase = 'failed';
    state.failureReason = 'deadlock';
    return { action: 'failed' };
  }

  function useReshuffle({ success }) {
    if (state.phase !== 'playing' || state.reshufflesRemaining === 0) {
      return { action: 'none' };
    }
    if (!success) {
      state.phase = 'failed';
      state.failureReason = 'generation';
      return { action: 'generation-failed' };
    }
    state.reshufflesRemaining--;
    return { action: 'reshuffled' };
  }

  function complete() {
    if (state.phase !== 'playing') return { action: 'none' };
    const nextLevel = state.currentLevel + 1;
    state.currentLevel = nextLevel;
    state.highestUnlocked = nextLevel;
    state.levelSeed = nextLevel >= 6 ? createNextSeed() : null;
    state.phase = 'level-complete';
    return {
      action: 'level-complete',
      progress: {
        version: 1,
        currentLevel: nextLevel,
        highestUnlocked: nextLevel,
        levelSeed: state.levelSeed,
      },
    };
  }

  function fail(reason) {
    state.phase = 'failed';
    state.failureReason = reason;
    return snapshot();
  }

  return {
    snapshot,
    retry,
    useHint,
    deadlock,
    useReshuffle,
    complete,
    fail,
  };
}

export function createLevelSession({ progress, config, createNextSeed }) {
  const initial = Object.freeze({
    hints: config.hints,
    reshuffles: config.reshuffles,
    rewardedReshuffleLimit: config.rewardedReshuffleLimit ?? 0,
  });
  const state = {
    currentLevel: progress.currentLevel,
    highestUnlocked: progress.highestUnlocked,
    levelSeed: progress.levelSeed,
    hintsRemaining: initial.hints,
    reshufflesRemaining: initial.reshuffles,
    rewardedReshufflesUsed: 0,
    phase: 'playing',
    failureReason: null,
  };

  const snapshot = () => Object.freeze({ ...state });

  function retry() {
    state.hintsRemaining = initial.hints;
    state.reshufflesRemaining = initial.reshuffles;
    state.rewardedReshufflesUsed = 0;
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

  function deadlock({ canEarnReshuffle = false } = {}) {
    if (state.phase !== 'playing') return { action: 'none' };
    if (state.reshufflesRemaining > 0) return { action: 'offer-reshuffle' };
    if (canEarnReshuffle && state.rewardedReshufflesUsed < initial.rewardedReshuffleLimit) {
      return { action: 'offer-rewarded-reshuffle' };
    }
    state.phase = 'failed';
    state.failureReason = 'deadlock';
    return { action: 'failed' };
  }

  function canEarnRewardedReshuffle() {
    return state.phase === 'playing' && state.reshufflesRemaining === 0 &&
      state.rewardedReshufflesUsed < initial.rewardedReshuffleLimit;
  }

  function grantRewardedReshuffle() {
    if (!canEarnRewardedReshuffle()) {
      return { action: 'none' };
    }
    state.rewardedReshufflesUsed++;
    state.reshufflesRemaining++;
    return { action: 'granted' };
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
    grantRewardedReshuffle,
    canEarnRewardedReshuffle,
    complete,
    fail,
  };
}

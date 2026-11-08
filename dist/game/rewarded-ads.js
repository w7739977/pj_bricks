// The host registers its real rewarded-ad SDK adapter. No provider, no ad UI.
// A close/cancel event is not a reward: only the SDK's earned-reward callback
// may resolve show() with { rewarded: true }.
let registeredProvider = null;

export function registerRewardedAdsProvider(provider) {
  if (provider !== null && (typeof provider?.isAvailable !== 'function' ||
      typeof provider?.show !== 'function')) {
    throw new TypeError('Rewarded ads require isAvailable() and show()');
  }
  registeredProvider = provider;
}

export function createRewardedAdGateway({ getProvider = () => registeredProvider } = {}) {
  let pending = false;
  function isAvailable() {
    if (pending) return false;
    try { return getProvider()?.isAvailable() === true; }
    catch { return false; }
  }
  async function request(context) {
    if (pending) return { status: 'busy' };
    const provider = getProvider();
    if (!isAvailable()) return { status: 'unavailable' };
    pending = true;
    try {
      const result = await provider.show({ ...context, placement: 'deadlock-reshuffle' });
      return { status: result?.rewarded === true ? 'rewarded' : 'cancelled' };
    } catch {
      return { status: 'error' };
    } finally {
      pending = false;
    }
  }
  return { isAvailable, request };
}

export async function requestReshuffleReward({ gateway, session, isCurrent, levelNumber }) {
  if (!isCurrent()) return { status: 'stale' };
  if (!session.canEarnRewardedReshuffle()) return { status: 'limit' };
  const result = await gateway.request({ levelNumber });
  if (!isCurrent()) return { status: 'stale' };
  if (result.status !== 'rewarded') return result;
  return { status: session.grantRewardedReshuffle().action === 'granted' ? 'rewarded' : 'limit' };
}

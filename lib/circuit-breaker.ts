type BreakerState = {
  failures: number;
  openedAt: number | null;
};

const breakers = new Map<string, BreakerState>();

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000;

function getState(key: string): BreakerState {
  const existing = breakers.get(key);
  if (existing) return existing;
  const state: BreakerState = { failures: 0, openedAt: null };
  breakers.set(key, state);
  return state;
}

export function canProceed(key: string): boolean {
  const state = getState(key);

  if (state.openedAt === null) {
    return true;
  }

  if (Date.now() - state.openedAt >= COOLDOWN_MS) {
    state.failures = 0;
    state.openedAt = null;
    return true;
  }

  return false;
}

export function recordFailure(key: string): void {
  const state = getState(key);
  state.failures += 1;

  if (state.failures >= FAILURE_THRESHOLD) {
    state.openedAt = Date.now();
  }
}

export function recordSuccess(key: string): void {
  const state = getState(key);
  state.failures = 0;
  state.openedAt = null;
}

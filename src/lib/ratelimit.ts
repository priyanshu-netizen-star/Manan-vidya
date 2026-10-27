/**
 * Fixed-window in-memory rate limiter. Adequate for a single server instance;
 * a multi-instance production deployment should back this with a shared store
 * (documented in docs/15-deployment-and-maintenance.md).
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowSeconds: number): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }
    return true;
  }
  w.count += 1;
  return w.count <= max;
}

export function resetRateLimits() {
  windows.clear();
}

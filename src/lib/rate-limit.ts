/**
 * Lightweight in-memory rate limiter.
 *
 * IMPORTANT: this is per-process. On Vercel, each serverless instance has
 * its own memory, so the effective limit is fuzzy under load. For
 * production-grade limiting use Upstash Ratelimit, Vercel KV, or
 * @vercel/firewall. This module exists so abusive callers hit *some* limit
 * during the short window between "deploy public" and "wire up real limiter".
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

/**
 * Allow up to `max` events per `windowMs` per `key`.
 * Returns ok=false when over the limit.
 */
export function rateLimit(key: string, max = 5, windowMs = 60_000): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, fresh)
    return { ok: true, remaining: max - 1, resetAt: fresh.resetAt }
  }

  bucket.count += 1
  if (bucket.count > max) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt }
  }
  return { ok: true, remaining: max - bucket.count, resetAt: bucket.resetAt }
}

/**
 * Best-effort client identifier from a request.
 * Prefers the authenticated user id; falls back to the proxied IP.
 */
export function clientKey(req: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`
  const fwd = req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0]?.trim() || 'unknown'
  return `ip:${ip}`
}

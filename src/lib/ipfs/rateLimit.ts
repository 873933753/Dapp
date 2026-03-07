/**
 * 简单的内存速率限制器（适用于单实例 Next.js）
 *
 * windowMs  — 滑动窗口时长（毫秒）
 * maxHits   — 窗口内允许的最大次数
 */

interface HitRecord {
  timestamps: number[]
}

const store = new Map<string, HitRecord>()

// 每 10 分钟清理过期记录，防止内存泄漏
const CLEANUP_INTERVAL = 10 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const cutoff = now - windowMs
  for (const [key, record] of store) {
    record.timestamps = record.timestamps.filter((t) => t > cutoff)
    if (record.timestamps.length === 0) store.delete(key)
  }
}

export function checkRateLimit(
  key: string,
  windowMs: number,
  maxHits: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup(windowMs)

  const now = Date.now()
  const cutoff = now - windowMs

  let record = store.get(key)
  if (!record) {
    record = { timestamps: [] }
    store.set(key, record)
  }

  // 移除窗口外的旧记录
  record.timestamps = record.timestamps.filter((t) => t > cutoff)

  if (record.timestamps.length >= maxHits) {
    const oldest = record.timestamps[0]
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: oldest + windowMs - now,
    }
  }

  record.timestamps.push(now)
  return {
    allowed: true,
    remaining: maxHits - record.timestamps.length,
    retryAfterMs: 0,
  }
}

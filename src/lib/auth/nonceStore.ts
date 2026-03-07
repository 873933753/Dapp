import { randomBytes } from 'node:crypto'

interface NonceRecord {
  expiresAt: number
}

const store = new Map<string, NonceRecord>()
const NONCE_TTL_MS = 5 * 60 * 1000

function cleanupExpired() {
  const now = Date.now()
  for (const [nonce, record] of store) {
    if (record.expiresAt <= now) {
      store.delete(nonce)
    }
  }
}

export function createNonce(): string {
  cleanupExpired()
  const nonce = randomBytes(16).toString('hex')
  store.set(nonce, { expiresAt: Date.now() + NONCE_TTL_MS })
  return nonce
}

export function consumeNonce(nonce: string): boolean {
  cleanupExpired()
  const record = store.get(nonce)
  if (!record) return false
  if (record.expiresAt <= Date.now()) {
    store.delete(nonce)
    return false
  }
  store.delete(nonce)
  return true
}

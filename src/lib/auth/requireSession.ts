import { NextRequest } from 'next/server'
import { getSessionAddress } from './session'

export function requireSession(request: NextRequest):
  | { ok: true; address: string }
  | { ok: false; response: Response } {
  const address = getSessionAddress(request)
  if (!address) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      ),
    }
  }

  return { ok: true, address }
}

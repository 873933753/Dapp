import { getSessionAddress } from '@/lib/auth/session'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const address = getSessionAddress(request)
  if (!address) {
    return Response.json(
      { success: false, authenticated: false },
      { status: 401 },
    )
  }

  return Response.json({
    success: true,
    authenticated: true,
    address,
  })
}

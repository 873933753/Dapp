/**
 * IPFS Pin 列表 API
 *
 * GET /api/ipfs/list?provider=pinata
 * 需要先完成钱包签名登录（Cookie 会话）
 *
 * 返回:
 * {
 *   success: boolean,
 *   pins: Array<{
 *     cid: string,
 *     name: string,
 *     size: number,
 *     date: string,
 *     gatewayUrl: string
 *   }>
 * }
 */

import { getIpfsProvider } from '@/lib/ipfs'
import { requireSession } from '@/lib/auth/requireSession'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request)
    if ('response' in session) return session.response

    const { searchParams } = new URL(request.url)
    const providerName = searchParams.get('provider') || undefined

    const provider = getIpfsProvider(providerName)
    const pins = await provider.list(session.address)

    return Response.json({
      success: true,
      pins: pins.map((p) => ({
        ...p,
        gatewayUrl: provider.gatewayUrl(p.cid),
      })),
    })
  } catch (err: any) {
    console.error('[IPFS list]', err)
    return Response.json(
      { success: false, error: err.message || 'Failed to list pins' },
      { status: 500 },
    )
  }
}

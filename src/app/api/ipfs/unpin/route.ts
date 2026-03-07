/**
 * IPFS Unpin API
 *
 * DELETE /api/ipfs/unpin
 * Content-Type: application/json
 * 需要先完成钱包签名登录（Cookie 会话）
 *
 * Body:
 *   { cid: string, provider?: string }
 *
 * 返回:
 *   { success: boolean }
 */

import { getIpfsProvider } from '@/lib/ipfs'
import { requireSession } from '@/lib/auth/requireSession'
import { NextRequest } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const session = requireSession(request)
    if ('response' in session) return session.response

    const body = await request.json()
    const { cid, provider: providerName } = body

    if (!cid) {
      return Response.json(
        { success: false, error: 'Missing cid' },
        { status: 400 },
      )
    }

    const provider = getIpfsProvider(providerName)
    const ownPins = await provider.list(session.address)
    const hasOwnership = ownPins.some((pin) => pin.cid === cid)
    if (!hasOwnership) {
      return Response.json(
        { success: false, error: 'No permission to unpin this CID' },
        { status: 403 },
      )
    }
    await provider.unpin(cid)

    return Response.json({ success: true })
  } catch (err: any) {
    console.error('[IPFS unpin]', err)
    return Response.json(
      { success: false, error: err.message || 'Unpin failed' },
      { status: 500 },
    )
  }
}

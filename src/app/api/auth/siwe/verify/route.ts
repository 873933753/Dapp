import { consumeNonce } from '@/lib/auth/nonceStore'
import { setSessionCookie } from '@/lib/auth/session'
import { NextResponse } from 'next/server'
import { recoverMessageAddress } from 'viem'

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

function parseField(message: string, field: 'Address' | 'Nonce'): string {
  const match = message.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))
  return match?.[1]?.trim() || ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = (body?.message as string) || ''
    const signature = (body?.signature as string) || ''

    if (!message || !signature) {
      return Response.json(
        { success: false, error: 'Missing message or signature' },
        { status: 400 },
      )
    }

    if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
      return Response.json(
        { success: false, error: 'Invalid signature format' },
        { status: 400 },
      )
    }

    const addressInMessage = parseField(message, 'Address').toLowerCase()
    const nonce = parseField(message, 'Nonce')

    if (!ETH_ADDRESS_RE.test(addressInMessage)) {
      return Response.json(
        { success: false, error: 'Invalid address in signed message' },
        { status: 400 },
      )
    }

    if (!nonce || !consumeNonce(nonce)) {
      return Response.json(
        { success: false, error: 'Invalid or expired nonce' },
        { status: 400 },
      )
    }

    const recovered = (
      await recoverMessageAddress({ message, signature: signature as `0x${string}` })
    ).toLowerCase()

    if (recovered !== addressInMessage) {
      return Response.json(
        { success: false, error: 'Signature does not match address' },
        { status: 401 },
      )
    }

    const response = NextResponse.json({ success: true, address: recovered })
    setSessionCookie(response, recovered)
    return response
  } catch (err: any) {
    return Response.json(
      { success: false, error: err?.message || 'Failed to verify signature' },
      { status: 500 },
    )
  }
}

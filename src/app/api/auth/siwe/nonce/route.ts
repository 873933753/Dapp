import { createNonce } from '@/lib/auth/nonceStore'

export async function GET() {
  return Response.json({ success: true, nonce: createNonce() })
}

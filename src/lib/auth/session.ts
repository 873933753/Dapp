import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

export const SESSION_COOKIE_NAME = 'ipfs_session'

interface SessionPayload {
  address: string
  exp: number
}

const SESSION_TTL_SEC = 60 * 60 // 1 hour

function getSessionSecret(): string {
  return process.env.IPFS_AUTH_SECRET || 'dev-change-this-secret'
}

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url')
}

function fromB64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function sign(input: string): string {
  return createHmac('sha256', getSessionSecret()).update(input).digest('base64url')
}

export function createSessionToken(address: string): string {
  const payload: SessionPayload = {
    address: address.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  }
  const encodedPayload = b64url(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expected = sign(encodedPayload)
  if (signature.length !== expected.length) return null
  const safe = timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  if (!safe) return null

  try {
    const payload = JSON.parse(fromB64url(encodedPayload)) as SessionPayload
    if (!payload.address || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function setSessionCookie(response: NextResponse, address: string) {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(address), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export function getSessionAddress(request: NextRequest): string | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const payload = verifySessionToken(token)
  return payload?.address || null
}

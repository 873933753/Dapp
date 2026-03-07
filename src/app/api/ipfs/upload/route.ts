/**
 * IPFS 文件上传 API
 *
 * POST /api/ipfs/upload
 * Content-Type: multipart/form-data
 *
 * 字段:
 *   file      — 要上传的文件（必填）
 *   provider  — "pinata" | "ipfs-node"（可选，默认读取 env）
 *
 * 返回:
 * {
 *   success: boolean,
 *   cid: string,
 *   name: string,
 *   size: number,
 *   gatewayUrl: string,
 *   provider: string
 * }
 */

import { getIpfsProvider } from '@/lib/ipfs'
import { checkRateLimit } from '@/lib/ipfs/rateLimit'
import { requireSession } from '@/lib/auth/requireSession'
import { NextRequest } from 'next/server'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// 速率限制：每个 IP 每 15 分钟最多 10 次上传
const WINDOW_MS = 15 * 60 * 1000
const MAX_UPLOADS_PER_WINDOW = 10

// 每日限额：每个 IP 每天最多 50 次上传
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_UPLOADS_PER_DAY = 50

// 允许的文件类型（MIME 前缀或完整 MIME）
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
  'application/xml',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
])

// 允许的文件扩展名（兜底，当 MIME 不可靠时）
const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.pdf', '.txt', '.csv', '.html', '.json', '.xml',
  '.mp3', '.wav', '.mp4', '.webm',
])

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request)
    if ('response' in session) return session.response

    const clientIp = getClientIp(request)

    // 短窗口速率限制
    const windowCheck = checkRateLimit(`upload:${clientIp}`, WINDOW_MS, MAX_UPLOADS_PER_WINDOW)
    if (!windowCheck.allowed) {
      const retryMin = Math.ceil(windowCheck.retryAfterMs / 60000)
      return Response.json(
        { success: false, error: `Rate limit exceeded. Try again in ${retryMin} min.` },
        { status: 429 },
      )
    }

    // 每日限额
    const dayCheck = checkRateLimit(`upload-day:${clientIp}`, DAY_MS, MAX_UPLOADS_PER_DAY)
    if (!dayCheck.allowed) {
      return Response.json(
        { success: false, error: 'Daily upload limit (50) reached. Try again tomorrow.' },
        { status: 429 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const providerName = (formData.get('provider') as string) || undefined

    if (!file) {
      return Response.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      )
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { success: false, error: 'File exceeds 10 MB limit' },
        { status: 400 },
      )
    }

    // 文件类型检查
    const ext = getExtension(file.name)
    if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext)) {
      return Response.json(
        { success: false, error: `File type not allowed: ${file.type || ext || 'unknown'}` },
        { status: 400 },
      )
    }

    const provider = getIpfsProvider(providerName)
    const result = await provider.upload(file, file.name, session.address)

    return Response.json({
      success: true,
      cid: result.cid,
      name: result.name,
      size: result.size,
      gatewayUrl: provider.gatewayUrl(result.cid),
      provider: providerName || process.env.NEXT_PUBLIC_IPFS_PROVIDER || 'pinata',
    })
  } catch (err: any) {
    console.error('[IPFS upload]', err)
    return Response.json(
      { success: false, error: err.message || 'Upload failed' },
      { status: 500 },
    )
  }
}

/**
 * 通用 IPFS HTTP API Provider（兼容 Kubo / go-ipfs）
 *
 * ⚠️ Infura IPFS 已于 2023-09 停服。本 provider 兼容任何实现
 *    标准 IPFS HTTP API 的节点（本地 Kubo、自托管网关等）。
 *
 * 环境变量:
 *   IPFS_API_URL                — 节点 API 地址，默认 http://127.0.0.1:5001
 *   NEXT_PUBLIC_IPFS_GATEWAY    — 公共网关，默认 https://ipfs.io
 *   IPFS_API_PROJECT_ID         — （可选）Basic Auth 用户名
 *   IPFS_API_SECRET             — （可选）Basic Auth 密码
 */

import type { IpfsProvider, IpfsPinItem, IpfsUploadResult } from './types'

// 内存归属表：记录每个 CID 属于哪个钱包（IPFS 节点本身不支持 metadata）
const ownershipMap = new Map<string, string>()

export function createIpfsNodeProvider(): IpfsProvider {
  const apiUrl = process.env.IPFS_API_URL || 'http://127.0.0.1:5001'
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io'

  // 可选 Basic Auth（兼容旧 Infura IPFS 格式）
  const projectId = process.env.IPFS_API_PROJECT_ID
  const secret = process.env.IPFS_API_SECRET
  const headers: Record<string, string> = {}
  if (projectId && secret) {
    headers['Authorization'] =
      'Basic ' + Buffer.from(`${projectId}:${secret}`).toString('base64')
  }

  return {
    /* -------- upload -------- */
    async upload(file: File, fileName: string, walletAddress?: string): Promise<IpfsUploadResult> {
      const body = new FormData()
      body.append('file', file, fileName)

      const res = await fetch(`${apiUrl}/api/v0/add?pin=true`, {
        method: 'POST',
        headers,
        body,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`IPFS node upload failed (${res.status}): ${text}`)
      }

      const data = await res.json()
      const cid = data.Hash
      if (walletAddress) ownershipMap.set(cid, walletAddress)
      return {
        cid,
        name: data.Name || fileName,
        size: Number(data.Size) || file.size,
      }
    },

    /* -------- list -------- */
    async list(walletAddress?: string): Promise<IpfsPinItem[]> {
      const res = await fetch(`${apiUrl}/api/v0/pin/ls?type=recursive`, {
        method: 'POST',
        headers,
      })

      if (!res.ok) throw new Error(`IPFS node pin/ls failed: ${res.statusText}`)

      const data = await res.json()
      const keys: Record<string, { Type: string }> = data.Keys ?? {}

      return Object.keys(keys)
        .filter((cid) => !walletAddress || ownershipMap.get(cid) === walletAddress)
        .map((cid) => ({
          cid,
          name: '',
          size: 0,
          date: '',
        }))
    },

    /* -------- gateway -------- */
    gatewayUrl(cid: string): string {
      return `${gateway}/ipfs/${cid}`
    },

    /* -------- unpin -------- */
    async unpin(cid: string): Promise<void> {
      const res = await fetch(`${apiUrl}/api/v0/pin/rm?arg=${encodeURIComponent(cid)}`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) throw new Error(`IPFS node unpin failed: ${res.statusText}`)
      ownershipMap.delete(cid)
    },
  }
}

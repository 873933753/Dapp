/**
 * Pinata IPFS Provider
 *
 * 环境变量:
 *   PINATA_JWT                  — Pinata API JWT（必填）
 *   NEXT_PUBLIC_PINATA_GATEWAY  — 自定义网关，默认 https://gateway.pinata.cloud
 *
 * 文档: https://docs.pinata.cloud/api-reference
 */

import type { IpfsProvider, IpfsPinItem, IpfsUploadResult } from './types'

const API = 'https://api.pinata.cloud'

export function createPinataProvider(): IpfsProvider {
  const jwt = process.env.PINATA_JWT
  if (!jwt) throw new Error('Missing env: PINATA_JWT')

  const gateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud'

  const authHeaders = { Authorization: `Bearer ${jwt}` }

  return {
    /* -------- upload -------- */
    async upload(file: File, fileName: string, walletAddress?: string): Promise<IpfsUploadResult> {
      const body = new FormData()
      body.append('file', file)
      const metadata: Record<string, any> = { name: fileName }
      if (walletAddress) {
        metadata.keyvalues = { walletAddress }
      }
      body.append('pinataMetadata', JSON.stringify(metadata))

      const res = await fetch(`${API}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: authHeaders,
        body,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Pinata upload failed (${res.status}): ${text}`)
      }

      const data = await res.json()
      return { cid: data.IpfsHash, name: fileName, size: data.PinSize }
    },

    /* -------- list -------- */
    async list(walletAddress?: string): Promise<IpfsPinItem[]> {
      let url = `${API}/data/pinList?status=pinned&pageLimit=100&sortBy=date&sortOrder=DESC`
      if (walletAddress) {
        url += `&metadata[keyvalues][walletAddress][value]=${encodeURIComponent(walletAddress)}&metadata[keyvalues][walletAddress][op]=eq`
      }
      const res = await fetch(url, { headers: authHeaders })

      if (!res.ok) throw new Error(`Pinata list failed: ${res.statusText}`)

      const data = await res.json()
      return (data.rows ?? []).map((row: any) => ({
        cid: row.ipfs_pin_hash,
        name: row.metadata?.name || 'Unnamed',
        size: row.size,
        date: row.date_pinned,
      }))
    },

    /* -------- gateway -------- */
    gatewayUrl(cid: string): string {
      return `${gateway}/ipfs/${cid}`
    },

    /* -------- unpin -------- */
    async unpin(cid: string): Promise<void> {
      const res = await fetch(`${API}/pinning/unpin/${cid}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      if (!res.ok) throw new Error(`Pinata unpin failed: ${res.statusText}`)
    },
  }
}

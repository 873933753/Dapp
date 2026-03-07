/**
 * IPFS Provider 工厂
 *
 * 根据 NEXT_PUBLIC_IPFS_PROVIDER 环境变量（或运行时参数）返回对应实现。
 *   - "pinata"    → Pinata 云服务
 *   - "ipfs-node" → 本地/远程 Kubo 节点（兼容标准 IPFS HTTP API）
 */

export type { IpfsProvider, IpfsUploadResult, IpfsPinItem } from './types'

import type { IpfsProvider } from './types'
import { createPinataProvider } from './pinata'
import { createIpfsNodeProvider } from './ipfsNode'

const cache = new Map<string, IpfsProvider>()

/**
 * 获取（或创建）指定名称的 IPFS Provider 单例。
 *
 * @param name  "pinata" | "ipfs-node"，默认读取 NEXT_PUBLIC_IPFS_PROVIDER
 */
export function getIpfsProvider(name?: string): IpfsProvider {
  const key = name || process.env.NEXT_PUBLIC_IPFS_PROVIDER || 'pinata'

  if (!cache.has(key)) {
    switch (key) {
      case 'pinata':
        cache.set(key, createPinataProvider())
        break
      case 'ipfs-node':
        cache.set(key, createIpfsNodeProvider())
        break
      default:
        throw new Error(`Unknown IPFS provider: "${key}". Use "pinata" or "ipfs-node".`)
    }
  }

  return cache.get(key)!
}

/** 便捷：根据给定 CID 返回公共网关 URL */
export function ipfsGatewayUrl(cid: string): string {
  const gw =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY ||
    process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
    'https://ipfs.io'
  return `${gw}/ipfs/${cid}`
}

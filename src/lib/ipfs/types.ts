/**
 * IPFS Provider 抽象接口
 *
 * 所有 IPFS 服务提供商（Pinata、Kubo 本地节点等）均实现此接口，
 * 从而在 API route 层无需关心底层细节。
 */

/** 上传结果 */
export interface IpfsUploadResult {
  cid: string
  name: string
  size: number
}

/** Pin 列表条目 */
export interface IpfsPinItem {
  cid: string
  name: string
  size: number
  /** ISO-8601 日期；IPFS 节点可能为空 */
  date: string
}

/** Provider 统一接口 */
export interface IpfsProvider {
  /** 上传文件并返回 CID（walletAddress 用于归属绑定） */
  upload(file: File, fileName: string, walletAddress?: string): Promise<IpfsUploadResult>
  /** 获取已 pin 的文件列表（传 walletAddress 时只返回该地址的文件） */
  list(walletAddress?: string): Promise<IpfsPinItem[]>
  /** 根据 CID 生成公共网关 URL */
  gatewayUrl(cid: string): string
  /** 取消 pin */
  unpin(cid: string): Promise<void>
}

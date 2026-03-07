'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

/* ------ 类型 ------ */
interface PinItem {
  cid: string
  name: string
  size: number
  date: string
  gatewayUrl: string
}

/* ------ constants ------ */
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.pdf', '.txt', '.csv', '.html', '.json', '.xml',
  '.mp3', '.wav', '.mp4', '.webm',
])

/* ------ helpers ------ */
function humanSize(bytes: number): string {
  if (bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return `File too large (max 10 MB)`
  const ext = getExtension(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) return `File type not allowed: ${ext || 'unknown'}`
  return null
}

/* ================================================================== */
export default function IpfsPage() {
  const t = useTranslations('Ipfs')
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { openConnectModal } = useConnectModal()

  /* --- provider 切换 --- */
  const [provider, setProvider] = useState<'pinata' | 'ipfs-node'>('pinata')

  /* --- 上传状态 --- */
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    cid: string
    name: string
    gatewayUrl: string
  } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  /* --- 列表状态 --- */
  const [pins, setPins] = useState<PinItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  /* --- 复制 CID 提示 --- */
  const [copiedCid, setCopiedCid] = useState<string | null>(null)

  const ensureSession = useCallback(async () => {
    if (!isConnected || !address) return false

    const meRes = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    })
    if (meRes.ok) return true

    const nonceRes = await fetch('/api/auth/siwe/nonce', {
      method: 'GET',
      credentials: 'include',
    })
    const nonceData = await nonceRes.json()
    if (!nonceData?.success || !nonceData?.nonce) {
      throw new Error('Failed to get nonce')
    }

    const issuedAt = new Date().toISOString()
    const message = [
      'Hanber IPFS Login',
      `Address: ${address}`,
      `Nonce: ${nonceData.nonce}`,
      `Issued At: ${issuedAt}`,
    ].join('\n')

    const signature = await signMessageAsync({ account: address, message })
    const verifyRes = await fetch('/api/auth/siwe/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, signature }),
    })
    const verifyData = await verifyRes.json()
    if (!verifyData?.success) {
      throw new Error(verifyData?.error || 'Wallet verification failed')
    }

    return true
  }, [isConnected, address, signMessageAsync])

  /* -------- 获取列表 -------- */
  const fetchPins = useCallback(async () => {
    if (!isConnected || !address) {
      setPins([])
      return
    }

    setListLoading(true)
    setListError(null)
    try {
      await ensureSession()
      const res = await fetch(`/api/ipfs/list?provider=${provider}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPins(data.pins)
    } catch (err: any) {
      setListError(err.message || 'Failed to fetch')
    } finally {
      setListLoading(false)
    }
  }, [provider, address, isConnected, ensureSession])

  useEffect(() => {
    fetchPins()
  }, [fetchPins])

  /* -------- 上传 -------- */
  const handleUpload = async () => {
    if (!selectedFile || !isConnected || !address) return
    setUploading(true)
    setUploadResult(null)
    setUploadError(null)

    try {
      await ensureSession()

      const form = new FormData()
      form.append('file', selectedFile)
      form.append('provider', provider)

      const res = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setUploadResult({ cid: data.cid, name: data.name, gatewayUrl: data.gatewayUrl })
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      // 刷新列表
      fetchPins()
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  /* -------- Unpin -------- */
  const [unpinningCid, setUnpinningCid] = useState<string | null>(null)

  const handleUnpin = async (cid: string) => {
    if (!confirm(t('unpinConfirm'))) return
    setUnpinningCid(cid)
    try {
      await ensureSession()

      const res = await fetch('/api/ipfs/unpin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cid, provider }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      // 从列表移除
      setPins((prev) => prev.filter((p) => p.cid !== cid))
    } catch (err: any) {
      alert(err.message || 'Unpin failed')
    } finally {
      setUnpinningCid(null)
    }
  }

  /* ================================================================== */
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* ---------- Header ---------- */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-1">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      {/* ---------- 钱包未连接提示 ---------- */}
      {!isConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
          <span className="text-yellow-600 dark:text-yellow-400">⚠</span>
          <span className="text-yellow-700 dark:text-yellow-300">{t('connectWalletHint')}</span>
        </div>
      )}

      {/* ---------- Provider 切换 ---------- */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-3">{t('provider')}</h2>
        <div className="flex gap-2">
          {(['pinata', 'ipfs-node'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                provider === p
                  ? 'bg-blue-100 dark:bg-blue-600 text-blue-500 dark:text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              {p === 'pinata' ? 'Pinata' : t('ipfsNode')}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Upload ---------- */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">{t('upload')}</h2>

        {/* drop zone */}
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:bg-muted/40 transition-colors">
          <span className="text-3xl">📁</span>
          <span className="text-sm text-muted-foreground">
            {selectedFile ? selectedFile.name : t('dropHint')}
          </span>
          {selectedFile && (
            <span className="text-xs text-muted-foreground">
              {humanSize(selectedFile.size)}
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.txt,.csv,.html,.json,.xml,.mp3,.wav,.mp4,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                const err = validateFile(f)
                if (err) {
                  setUploadError(err)
                  if (fileRef.current) fileRef.current.value = ''
                  return
                }
                setUploadError(null)
                setSelectedFile(f)
              }
            }}
          />
        </label>

        {/* upload limits hint */}
        <p className="text-xs text-muted-foreground text-center">
          {t('uploadLimits')}
        </p>

        {/* upload button */}
        <button
          onClick={isConnected ? handleUpload : openConnectModal}
          disabled={isConnected && (!selectedFile || uploading)}
          className="btn-action w-full font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          {!isConnected ? t('connectWallet') : uploading ? t('uploading') : t('uploadBtn')}
        </button>

        {/* upload result */}
        {uploadResult && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg space-y-1">
            <p className="font-semibold text-green-800 dark:text-green-200">{t('uploadSuccess')}</p>
            <p className="text-xs text-muted-foreground break-all">CID: {uploadResult.cid}</p>
            <a
              href={uploadResult.gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('viewOnGateway')} →
            </a>
          </div>
        )}

        {uploadError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
          </div>
        )}
      </div>

      {/* ---------- Pin List ---------- */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{t('fileList')}</h2>
          <button
            onClick={fetchPins}
            disabled={listLoading}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {listLoading ? t('loading') : t('refresh')}
          </button>
        </div>

        {listError && (
          <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
          </div>
        )}

        {pins.length === 0 && !listLoading && !listError && (
          <p className="text-center text-muted-foreground text-sm py-8">{t('noFiles')}</p>
        )}

        {pins.length > 0 && (
          <div className="space-y-3">
            {pins.map((pin) => (
              <div
                key={pin.cid}
                className="bg-muted/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2"
              >
                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{pin.name || pin.cid}</p>
                  <p className="text-xs text-muted-foreground break-all">{pin.cid}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {pin.size > 0 && <span>{humanSize(pin.size)}</span>}
                    {pin.date && (
                      <span>{new Date(pin.date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {/* actions */}
                <div className="flex gap-2 shrink-0">
                  <a
                    href={pin.gatewayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-action-solid text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    {t('download')}
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pin.cid)
                      setCopiedCid(pin.cid)
                      setTimeout(() => setCopiedCid(null), 2000)
                    }}
                    className="bg-secondary hover:bg-accent text-foreground text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    {copiedCid === pin.cid ? t('copied') : t('copyCid')}
                  </button>
                  <button
                    onClick={() => handleUnpin(pin.cid)}
                    disabled={unpinningCid === pin.cid}
                    className="btn-danger text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    {unpinningCid === pin.cid ? t('unpinning') : t('unpin')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- How it works ---------- */}
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        <h3 className="font-semibold text-foreground mb-3">{t('info.title')}</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>{t('info.first')}</li>
          <li>{t('info.second')}</li>
          <li>{t('info.third')}</li>
          <li>{t('info.fourth')}</li>
        </ol>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useImperativeHandle, useState } from "react"
import { formatUnits } from "viem"
import { SWAP_ABI } from "@/lib/abis"
import { useReadContract } from "wagmi"

export default function PoolDash({chainId,swapAddress,refreshTrigger}){
  const [ poolData, setPoolData ] = useState(null)
  /* 获取tvl - 从接口获取 */
  const fetchTVL = useCallback(() => {
    fetch('/api/stake/pools')
      .then(res => res.json())
      .then(data => setPoolData(data))
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetchTVL()
  }, [fetchTVL, refreshTrigger, chainId]) // 依赖 refreshTrigger 和 chainId


  /* 读取TKA TKB数量 */
  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getReserves',
    enabled: Boolean(swapAddress),
    query: {
      // 添加 queryKey 让 React Query 管理缓存
      queryKey: ['reserves', swapAddress, chainId],
    }
  })

  // 当 swapAddress 或 chainId 变化时，自动重新获取
  useEffect(() => {
    if (swapAddress) {
      refetchReserves()
    }
  }, [swapAddress, chainId, refetchReserves,refreshTrigger])

  return(
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-blue-100  rounded-lg shadow-lg p-6 text-gray-700">
        <div className="text-sm opacity-90 mb-1">Total TVL</div>
        <div className="text-2xl font-bold">
          {poolData?.pools?.[0]?.tvl
            ? `$${parseFloat(poolData.pools[0].tvl).toLocaleString()}`
            : '$0'
          }
        </div>
      </div>

      <div className="bg-blue-100 text-blue-500 rounded-lg shadow-lg p-6 text-gray-700">
        <div className="text-sm opacity-90 mb-1">Reserve A</div>
        <div className="text-2xl font-bold">
          {reserves ? Number(formatUnits(reserves[0], 18, 2)).toFixed(2) : '0'} TKA
        </div>
      </div>

      <div className="bg-blue-100 text-blue-500 rounded-lg shadow-lg p-6 text-gray-700">
        <div className="text-sm opacity-90 mb-1">Reserve B</div>
        <div className="text-2xl font-bold">
          {reserves ? Number(formatUnits(reserves[1], 18, 2)).toFixed(2) : '0'} TKB
        </div>
      </div>
    </div>
  )
}
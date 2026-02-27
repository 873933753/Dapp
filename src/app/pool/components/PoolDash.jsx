import { useEffect, useState } from "react"
import { formatUnits } from "viem"
import { SWAP_ABI } from "@/lib/abis"
import { useReadContract } from "wagmi"

export default function PoolDash({chainId,swapAddress}){
  const [ poolData, setPoolData ] = useState(null)
  /* 获取tvl - 从接口获取 */
  useEffect(() => {
    fetch('/api/stake/pools')
      .then(res => res.json())
      .then(data => setPoolData(data))
      .catch(console.error)
  },[])


  /* 读取TKA TKB数量 */
  const { data: reserves } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getReserves',
    enabled: Boolean(swapAddress)
  })
  return(
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="text-sm opacity-90 mb-1">Total TVL</div>
        <div className="text-2xl font-bold">
          {poolData?.pools?.[0]?.tvl
            ? `$${parseFloat(poolData.pools[0].tvl).toLocaleString()}`
            : '$0'
          }
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
        <div className="text-sm opacity-90 mb-1">Reserve A</div>
        <div className="text-2xl font-bold">
          {reserves ? Number(formatUnits(reserves[0], 18, 2)).toFixed(2) : '0'} TKA
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="text-sm opacity-90 mb-1">Reserve B</div>
        <div className="text-2xl font-bold">
          {reserves ? Number(formatUnits(reserves[0], 18, 2)).toFixed(2) : '0'} TKB
        </div>
      </div>
    </div>
  )
}
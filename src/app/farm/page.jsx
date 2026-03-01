'use client'

import { getProtocolAddress } from "@/lib/constants"
import { formatNumber, formatUSD } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useChainId } from "wagmi"

/* 
  Farm
  流动性挖矿核心流程：
  你先把一种特殊的凭证（LP代币）质押进一个专门的智能合约（Farm合约）里，
  然后这个合约会每天给你发放额外的代币作为奖励。
*/

export default function FarmPage(){
  const chainId = useChainId()
  const formAddress = getProtocolAddress(chainId,'farm')

  const [ farmData, setFarmData] = useState(null)
  const [error, setError] = useState(null)
  const [ isLoading, setIsLoading ] = useState(true)
  /* overall数据请接口获取 - mock */
  
  
  useEffect(() => {
    setError(null)
    setIsLoading(true)
    fetch('/api/farm/stats')
      .then(res => {
        if(!res.ok){
          throw new Error('Failed to fetch farm data')
        }
        return res.json()
      })
      .then(data => {
        setFarmData(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error fetching farm data:', err)
        setError(err.message)
        setIsLoading(false)
      })
  },[formAddress]) // 切链需要重新请求


  // 加载中显示加载模块
  if(isLoading){
    return <LoadingModel error={error} />
  }
  // 请求报错显示错误模块
  if(error){
    return <ErrorModel />
  }

  return(
    <div className="container py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Farm</h1>
          <p className="text-gray-600">Stake LP tokens to earn DRT rewards</p>
        </div>

        {/* Overall Stats */}
        <OverallAStats farmData={farmData} />

        {/* Farm Pools */}
        <div>
          <h2 className="text-xl font-bold mb-4">Available Pools</h2>
          {/* {farmData.pools.map((pool, index) => (
            <FarmPoolCard
              key={pool.id !== undefined ? pool.id : `pool-${index}`}
              pool={pool}
              farmAddress={farmAddress}
              userAddress={address}
              isMockMode={isMockMode}
              chainId={chainId}
            />
          ))} */}
        </div>

        {/* Info Section */}
        <InfoSection />
      </div>
    </div>
  )
}

//overall
function OverallAStats({farmData = {}}){
  return(
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-blue-100 rounded-lg shadow-lg p-6 text-gray-700">
        <div className="text-sm opacity-90 mb-1">Total Value Locked</div>
        <div className="text-3xl font-bold">
          {formatUSD(farmData.totalValueLocked)}
        </div>
      </div>

      <div className="bg-blue-100 rounded-lg shadow-lg p-6 text-gray-700">
        <div className="text-sm opacity-90 mb-1">Active Farms</div>
        <div className="text-3xl font-bold">
          {farmData.pools.length}
        </div>
      </div>

      <div className="bg-blue-100 rounded-lg shadow-lg p-6 text-gray-700">
        <div className="text-sm opacity-90 mb-1">Active Users</div>
        <div className="text-3xl font-bold">
          {formatNumber(farmData.activeUsers)}
        </div>
      </div>
    </div>
  )
}


/* error */
function ErrorModel({error}){
  return(
    <div className="container py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Farm</h1>
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xl font-semibold text-gray-800 mb-2">Error Loading Farm Data</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-300 hover:bg-blue-400 text-white semibold py-2 px-6 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}

/* loading */
function LoadingModel(){
  return(
    <div className="container py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Farm</h1>
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading farm pools...</p>
        </div>
      </div>
    </div>
  )
}

function InfoSection(){
  return(
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">How Farming Works</h3>
      <ul className="text-sm text-gray-600 space-y-1">
        <li>• Deposit LP tokens to start earning DRT rewards</li>
        <li>• Rewards are calculated based on your share of the pool</li>
        <li>• Harvest rewards at any time without unstaking</li>
        <li>• Withdraw your LP tokens anytime (rewards auto-harvest)</li>
        <li>• Higher APY pools may have higher risk or lower liquidity</li>
      </ul>
    </div>
  )
}
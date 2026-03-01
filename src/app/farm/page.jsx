'use client'

import ApproveButton from "@/components/ApproveButton"
import CustomConnectBtn from "@/components/CustomConnectBtn"
import { ERC20_ABI, FARM_ABI } from "@/lib/abis"
import { getProtocolAddress } from "@/lib/constants"
import { formatNumber, formatUnits, formatUSD, parseUnits } from "@/lib/utils"
import { use, useEffect, useRef, useState } from "react"
import { useAccount, useBlockNumber, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi"

/* 
  Farm
  流动性挖矿核心流程：
  你先把一种特殊的凭证（LP代币）质押进一个专门的智能合约（Farm合约）里，
  然后这个合约会每天给你发放额外的代币作为奖励。
*/

function FarmPoolCard({pool,userAddress,farmAddress}){
  const [ amount, setAmount ] = useState('')
  const [ activeTab, setActiveTab ] = useState('deposit') // deposit or withdraw

   //获取stake余额
  const { data:userInfo, refetch:userInfoRefetch } = useReadContract({
    address: farmAddress,
    abi: FARM_ABI,
    functionName:'userInfo',
    args: userAddress && pool.id !== undefined ? [BigInt(pool.id), userAddress] : undefined,
    enabled: Boolean(farmAddress && userAddress && pool.id !== undefined )
  }) 
  //获取LpToken
  const { data:lpBalance, refetch: lpBalanceRefetch } = useReadContract({
    address: pool.lpTokenAddress,
    abi: ERC20_ABI,
    functionName:'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    enabled: Boolean(pool.lpTokenAddress && userAddress)
  })
  // 获取pending rewards
  const { data: pendingReward,refetch: pendingRewardRefetch } = useReadContract({
    address: farmAddress,
    abi: FARM_ABI,
    functionName: 'pendingReward',
    args: userAddress && pool.id !== undefined ? [BigInt(pool.id), userAddress] : undefined,
    enabled: Boolean(farmAddress && userAddress && pool.id !== undefined)
  })

  const userPendingReward = pendingReward ? formatUnits(pendingReward, 18, 6) : '0'
  const userLpBalance = formatUnits(lpBalance,18,6)
  const userStaked = userInfo ? formatUnits(userInfo[0],18,6) : 0

  const { data:harvestHash,writeContract:harvest, isPending: isHarvesting } = useWriteContract()
  const { isLoading:isHarvestConfirming, isSuccess: isHarvestSuccess } = useWaitForTransactionReceipt({
    hash:harvestHash
  })
  /* 取出奖励 */
  const handleHarvest = () => {
    if (!farmAddress || pool.id === undefined) return
    harvest({
      address: farmAddress,
      abi: FARM_ABI,
      functionName: 'harvest',
      args: [BigInt(pool.id)]
    })
  }

  // 方案 A: 监听区块
  const { data: blockNumber } = useBlockNumber({
    watch: false,
  });

  // 每次区块号变化时，重新获取数据
  useEffect(() => {
    if (blockNumber || isHarvestSuccess) {
      pendingRewardRefetch();
      console.log(`区块 ${blockNumber} - 重新获取数据`);
    }
  }, [blockNumber, pendingRewardRefetch, isHarvestSuccess]);


  const { data: depositHash, writeContract: deposit, isPending: isDepositing } = useWriteContract()
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash
  })
  /* 点击deposit-存Lp */
  const handleDeposit = () => {
    if (!farmAddress || !amount || pool.id === undefined) return
    if(amount > userLpBalance){
      return alert('LPBalance不足')
    }
    const amountWei = parseUnits(amount, 18)
    deposit({
      address: farmAddress,
      abi: FARM_ABI,
      functionName: 'deposit',
      args: [BigInt(pool.id), amountWei]
    })
  }
  //成功刷新Lp和staked
  // useEffect(() => {
  //   if(isDepositSuccess){
  //     lpBalanceRefetch()
  //     pendingRewardRefetch()
  //     setAmount('')
  //   }
  // },[isDepositSuccess])

  // Withdraw transaction
  const { data: withdrawHash, writeContract: withdraw, isPending: isWithdrawing } = useWriteContract()
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawHash
  })
  /* withdraw */
  const handleWithdraw = () => {
    if (!farmAddress || !amount || pool.id === undefined) return
    console.log('qqqq',amount,userStaked,amount > userStaked)
    if(Number(amount) > Number(userStaked)){
      return alert('Balance不足')
    }
    const amountWei = parseUnits(amount, 18)
    withdraw({
      address: farmAddress,
      abi: FARM_ABI,
      functionName: 'withdraw',
      args: [BigInt(pool.id), amountWei]
    })
  }
    //成功刷新Lp和staked
  useEffect(() => {
    if(isDepositSuccess || isWithdrawSuccess){
      lpBalanceRefetch()
      userInfoRefetch()
      // pendingRewardRefetch()
      setAmount('')
    }
  },[isDepositSuccess, isWithdrawSuccess])
  

  return(
    <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{}</h3>
          <p className="text-sm text-gray-600">{}</p>
        </div>
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
          {pool.apy.toFixed(2)}% APY
        </span>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">TVL</div>
          <div className="text-lg font-semibold">{formatUSD(pool.tvl)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Your Staked</div>
          <div className="text-lg font-semibold">{userStaked} LP</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-xs text-blue-500 mb-1">LP Balance</div>
          <div className="text-lg font-semibold text-blue-500">{userLpBalance} LP</div>
        </div>
      </div>

      {/* Pending Rewards */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600 mb-1">Pending Rewards</div>
            <div className="text-xl font-bold text-orange-500">{userPendingReward} DRT</div>
          </div>
          <button
              onClick={handleHarvest}
              disabled={isHarvesting || isHarvestConfirming || parseFloat(userPendingReward) === 0}
              className="bg-orange-400 hover:bg-orange-500 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isHarvesting || isHarvestConfirming ? 'Harvesting...' : 'Harvest'}
            </button>
        </div>
      </div>

      {/* Harvest Success */}
      {isHarvestSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-semibold">Harvest Successful!</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${harvestHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View on Etherscan →
          </a>
        </div>
      )}

      {/* Deposit/Withdraw Tabs */}
      <div className="border-t pt-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === 'deposit'
                ? 'bg-blue-200 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === 'withdraw'
                ? 'bg-blue-200 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-600">
                {activeTab === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}
              </label>
              <button className="text-sm text-blue-600">
                Balance: {activeTab === 'deposit' ? userLpBalance : userStaked} LP
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 text-xl font-semibold bg-transparent outline-none"
              />
              <div className="bg-white border rounded-lg px-3 py-2 font-semibold text-sm">
                LP
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {
          !userAddress ? (
            <CustomConnectBtn></CustomConnectBtn>
          ) : null
        }
        {
          userAddress ? (
            activeTab === 'deposit' ?(
              <ApproveButton
                tokenAddress={pool.lpTokenAddress}
                spenderAddress = {farmAddress}
                amountIn={ amount? parseUnits(amount,18) : 0n }
                disabled={!amount}
              >
                <button
                  onClick={handleDeposit}
                  disabled = { !amount || isDepositing || isDepositConfirming}
                  className="w-full bg-blue-100 text-blue-500 disabled:bg-gray-400 disabled:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isDepositing || isDepositConfirming ? 'Depositing...' : 'Deposit'}
                </button>
              </ApproveButton>
            ):(
              <button
                onClick={handleWithdraw}
                disabled={!amount || isWithdrawing || isWithdrawConfirming}
                className="w-full bg-red-300 hover:bg-red-500 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isWithdrawing || isWithdrawConfirming ? 'Withdrawing...' : 'Withdraw'}
              </button>
            )
          ) :null
        }

        {/* Transaction Success Messages */}
        {isDepositSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-semibold">Deposit Successful!</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${depositHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              View on Etherscan →
            </a>
          </div>
        )}

        {isWithdrawSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-semibold">Withdraw Successful!</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${withdrawHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              View on Etherscan →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FarmPage(){
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const farmAddress = getProtocolAddress(chainId,'FARM')

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
  },[farmAddress]) // 切链需要重新请求


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
          {
            farmData.pools.map((pool,index) => {
              return(
                <FarmPoolCard
                  key={pool.id}
                  pool = { pool }
                  userAddress={address}
                  farmAddress = { farmAddress }
                />
              )
            })
          }
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
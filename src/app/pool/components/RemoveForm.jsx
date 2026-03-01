'use client'
import CustomConnectBtn from "@/components/CustomConnectBtn"
import { SWAP_ABI } from "@/lib/abis"
import { formatUnits, parseUnits } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi"

export default function RemoveForm({isConnected,swapAddress,address,updatePool}){
  const t = useTranslations('Pool.remove')
  const [lpAmount,setLpAmount] = useState('')

  // Read reserves from chain
  const { data: reserves, isError: reservesError } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getReserves',
    enabled: Boolean(swapAddress)
  })

  /* 获取Lptoken余额 */
  const { data:lpBalance,refetch: lpBalanceRefetch } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: Boolean(swapAddress && address)
  })

  //根据LptokenAmount计算得到TKA B的数量
  // 获得A的数量 = 池子中代币A的总存储量 * （自己持有的LP代币数量/LP代币总供应量）
  const handleLpAmount = (value) => {
    setLpAmount(value)
  }
  
   // Calculate proportional amounts when removing liquidity
  const calculateRemoveAmounts = useMemo(() => {
    if (!lpAmount || parseFloat(lpAmount) <= 0 || !reserves || !lpBalance) {
      return { amountA: '0', amountB: '0' }
    }

    const lpAmountBig = parseUnits(lpAmount, 18)
    const lpBalanceBig = BigInt(lpBalance)

    if (lpAmountBig > lpBalanceBig) {
      return { amountA: '0', amountB: '0' }
    }

    // Calculate proportional amounts
    const reserveA = BigInt(reserves[0])
    const reserveB = BigInt(reserves[1])

    // Simple calculation: (lpAmount / lpBalance) * reserve
    const amountABig = (lpAmountBig * reserveA) / lpBalanceBig
    const amountBBig = (lpAmountBig * reserveB) / lpBalanceBig

    return {
      amountA: formatUnits(amountABig, 18, 6),
      amountB: formatUnits(amountBBig, 18, 6)
    }
  },[lpAmount])
  
  /* 点击remove */
  const { data:removeHash, writeContract: removeLiquidity,isPending: isRemoving } = useWriteContract()
  const { isLoading: isRemoveConfirming, isSuccess: isRemoveSuccess } = useWaitForTransactionReceipt({
    hash:removeHash
  })
  const handleRemoveLiquidity = () => {
    //lp余额超出
    const lpAmountBig = parseUnits(lpAmount, 18)
    const lpBalanceBig = BigInt(lpBalance)
    if (lpAmountBig > lpBalanceBig) {
      return alert('LpBalance不足')
    }

    removeLiquidity({
      address: swapAddress,
      abi: SWAP_ABI,
      functionName: 'removeLiquidity',
      args: [lpAmountBig]
    })
  }

  const handleMaxLP = () => {
    if (lpBalance) {
      setLpAmount(formatUnits(lpBalance, 18, 6))
    }
  }

  useEffect(() => {
    if(isRemoveSuccess){
      setLpAmount(0)
      updatePool?.()
      lpBalanceRefetch()
    }
  },[isRemoveSuccess])
  return(
    <>
      {/* LP Token Input */}
      <div className="mb-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-600">LP Tokens</label>
            <button
              onClick={handleMaxLP}
              className="text-sm text-blue-600"
            >
              LpBalance: {lpBalance ? formatUnits(lpBalance, 18, 4) : '0'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={lpAmount}
              onChange={(e) => handleLpAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 text-2xl font-semibold bg-transparent outline-none"
            />
            <div className="bg-white border rounded-lg px-3 py-2 font-semibold">
              LP
            </div>
          </div>
        </div>
      </div>

      {/* Arrow Down */}
      <div className="flex justify-center -my-2 relative z-10">
        <div className="bg-white border-4 border-gray-50 rounded-xl p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* Output Amounts */}
      <div className="mb-6 space-y-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-1">{t('You will receive')}</div>
          <div className="text-xl font-semibold">{calculateRemoveAmounts?.amountA} TKA</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-1">{t('You will receive')}</div>
          <div className="text-xl font-semibold">{calculateRemoveAmounts?.amountB} TKB</div>
        </div>
      </div>

      {/* Action Button */}

      {
        !isConnected ? (
          <CustomConnectBtn></CustomConnectBtn>
        ) : null
      }
      {
        isConnected ? (
          <button
            onClick={handleRemoveLiquidity}
            disabled={!lpAmount || isRemoving || isRemoveConfirming}

            className="w-full bg-red-200/50 hover:bg-red-300/50 hover:text-red-500 disabled:bg-gray-400 disabled:text-white text-red-400 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isRemoving || isRemoveConfirming ? t('Removing Liquidity') : t('Remove Liquidity')}
          </button>
        ) : null
      }

      {/* Success Message */}
      {isRemoveSuccess && (
        <div  className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">{t('Liquidity Removed Successfully')}!</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${removeHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View on Etherscan →
          </a>
        </div>
      )}
    </>
  )
}
'use client'

import CustomConnectBtn from "@/components/CustomConnectBtn"
import { SWAP_ABI } from "@/lib/abis"
import { getTokenAddress } from "@/lib/constants"
import { handleInputChange, debounce } from "@/lib/utils"
import { useCallback, useEffect, useRef, useState } from "react"
import { formatUnits, parseUnits } from "viem"
import { useReadContract } from "wagmi"

export default function AddForm({chainId,isConnected,balanceData,swapAddress}){
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const tokenAddressA = getTokenAddress(chainId,'TKA')
  const tokenAddressB = getTokenAddress(chainId,'TKB')
  // 标记是否是内部更新 - 否则A变化 → 更新B → B变化 → 更新A → A变化 → ..
  // 标记当前正在主动更新的输入框
  const activeInput = useRef(null)
  // 标记是否是内部更新（防止循环）
  const isInternalUpdate = useRef(false)
  // 存储当前的请求 ID，用于处理竞态
  const requestId = useRef(0)

  /* getAmountOut */
  const { data: chainQuoteB, isError: isQuoteErrorB, refetch: refetchBFromA } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getAmountOut',
    args: amountA && tokenAddressA ? [ tokenAddressA, parseUnits(amountA, 18)] : undefined,
    // 合约地址有效 && amountIn有输入 && 输入金额是大于 0 的有效数字 才读取合约--避免无效请求，减少不必要的链上交互，降低前端资源消耗
    query: {
      enabled: false, // 不自动执行，手动触发
    }
  })
  const { data: chainQuoteA, isError: isQuoteErrorA, refetch: refetchAFromB } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getAmountOut',
    args: amountB && tokenAddressB ? [ tokenAddressB, parseUnits(amountB, 18)] : undefined,
    // 合约地址有效 && amountIn有输入 && 输入金额是大于 0 的有效数字 才读取合约--避免无效请求，减少不必要的链上交互，降低前端资源消耗
    query: {
      enabled: false, // 不自动执行，手动触发
    }
  })

   // 防抖的合约调用：当 A 输入完成时计算 B
  const debouncedCalculateB = useCallback(
    debounce(async (value) => {
      if (!value || activeInput.current !== 'A') return
      
      const currentRequestId = ++requestId.current
      isInternalUpdate.current = true
      
      try {
        const result = await refetchBFromA()
        // 检查是否是当前请求（防止竞态）
        if (currentRequestId === requestId.current && result.data) {
          setAmountB(Number(formatUnits(result.data,18)).toFixed(4))
          activeInput.current = null // 计算完成
        }
      } catch (error) {
        console.error('计算 B 失败:', error)
        activeInput.current = null
      } finally {
        isInternalUpdate.current = false
      }
    }, 500), // 500ms 防抖，等待用户输入完成
    [refetchBFromA]
  )

  // 防抖的合约调用：当 B 输入完成时计算 A
  const debouncedCalculateA = useCallback(
    debounce(async (value) => {
      if (!value || activeInput.current !== 'B') return
      
      const currentRequestId = ++requestId.current
      isInternalUpdate.current = true
      
      try {
        const result = await refetchAFromB()
        if (currentRequestId === requestId.current && result.data) {
          setAmountA(Number(formatUnits(result.data,18)).toFixed(4))
          activeInput.current = null
        }
      } catch (error) {
        console.error('计算 A 失败:', error)
        activeInput.current = null
      } finally {
        isInternalUpdate.current = false
      }
    }, 500),
    [refetchAFromB]
  )

  const handleAmountA = (e) => {
    const value = handleInputChange(e)
    
    // 如果是内部更新，跳过
    if (isInternalUpdate.current) {
      return
    }
    
    setAmountA(value)
    activeInput.current = 'A'
    
    // 如果有有效值，触发计算 B
    if (value) {
      debouncedCalculateB(value)
    } else {
      // 如果清空了 A，也清空 B
      setAmountB('')
      activeInput.current = null
    }
  }

  const handleAmountB = (e) => {
    const value = handleInputChange(e)
    if (isInternalUpdate.current) {
      return
    }
    setAmountB(value)
    activeInput.current = 'B'
    
    if (value) {
      debouncedCalculateA(value)
    } else {
      setAmountA('')
      activeInput.current = null
    }
  }

  // 清理防抖
  useEffect(() => {
    return () => {
      debouncedCalculateB.cancel()
      debouncedCalculateA.cancel()
    }
  }, [debouncedCalculateB, debouncedCalculateA])


  return(
    <>
      {/* Token A Input */}
      <div className="mb-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-600">Token A</label>
            <button className="text-sm text-blue-600">
              Balance: { balanceData && balanceData[0]?.result ? Number(formatUnits(balanceData[0]?.result,18)).toFixed(4) : 0} TKA
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amountA}
              onChange={ e => handleAmountA(e)}
              placeholder="0.0"
              className="flex-1 text-2xl font-semibold bg-transparent outline-none"
            />
            <div className="bg-white border rounded-lg px-3 py-2 font-semibold">
              TKA
            </div>
          </div>
        </div>
      </div>

      {/* Plus Icon */}
      <div className="flex justify-center -my-2 relative z-10">
        <div className="bg-white border-4 border-gray-50 rounded-xl p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>

      {/* Token B Input */}
      <div className="mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-600">Token B</label>
            <button className="text-sm text-blue-600">
              Balance: { balanceData && balanceData[1]?.result ? Number(formatUnits(balanceData[1]?.result,18)).toFixed(4) : 0} TKB
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              onChange = { e => handleAmountB(e)}
              value={amountB}
              placeholder="0.0"
              className="flex-1 text-2xl font-semibold bg-transparent outline-none"
            />
            <div className="bg-white border rounded-lg px-3 py-2 font-semibold">
              TKB
            </div>
          </div>
        </div>
      </div>

      {/* Price Info */}
      

      {/* Action Button - Add Liquidity with Dual Approval */}
      {
        !isConnected ? (
          <CustomConnectBtn></CustomConnectBtn>
        ) : (
          <button
            disabled={true}
            className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-tight rounded-lg mt-6 cursor-pointer disabled:bg-gray-400 disabled:text-white"
          >
            {'Add Liquidity'}
          </button>
        )
      }

      {/* Success Message */}
    </>
  )
}
'use client'

import CustomConnectBtn from "@/components/CustomConnectBtn"
import { ERC20_ABI, SWAP_ABI } from "@/lib/abis"
import { getTokenAddress } from "@/lib/constants"
import { handleInputChange, debounce } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import { formatUnits, parseUnits } from "viem"
import { useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi"

export default function AddForm({chainId,isConnected,balanceData,swapAddress,address,updatePool}){
  const t = useTranslations('Pool.add')
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

  /* ---approve */
  //判断是否需要授权 -allowance < input才需要授权
  // const [needsApproval, setNeedsApproval] = useState(false)
  const [ needsApprovalA , setNeedsApprovalA ] = useState(false)
  const [ needsApprovalB , setNeedsApprovalB ] = useState(false)
  const [ warnText, setWarnText ] = useState('')

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


  /* ---approve--- */
  // 读取两种代币的授权额度
  const { data: allowanceData, refetch: allowanceRefetch, isError } = useReadContracts({
    contracts:[
      {
        address: tokenAddressA, // 代币TKA合约地址
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && swapAddress ? [ address, swapAddress ] : undefined, // 参数：授权人地址、被授权合约地址
        enabled: Boolean(address && swapAddress && tokenAddressA && amountA)
      },
      {
        address: tokenAddressB, // 代币TKB合约地址
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && swapAddress ? [ address, swapAddress ] : undefined, // 参数：授权人地址、被授权合约地址
        enabled: Boolean(address && swapAddress && tokenAddressB && amountB)
      }
    ]
  })
  useEffect(() => {
    //如果金额还未输入，授权额度也未读取，还不用授权
    if(amountA === undefined || amountB === null || allowanceData === undefined || allowanceData === null || isError){
      setNeedsApprovalA(false)
      setNeedsApprovalB(false)
      return
    }
    const amountBigA = typeof amountA === 'bigint' ? amountA : parseUnits(amountA.toString(),18)
    const amountBigB = typeof amountB === 'bigint' ? amountB : parseUnits(amountB.toString(),18)
    if(allowanceData[0].status !=='success'){
      return
    }
    const allowanceBigA = parseUnits(allowanceData[0].result.toString(),18)
    const allowanceBigB = parseUnits(allowanceData[1].result.toString(),18)
    // allowanceBig < amountBig 需要发起授权,否则无须发起授权
    // setNeedsApproval(allowanceBigA < amountBigA || allowanceBigB < amountBigB)
    setNeedsApprovalA(allowanceBigA < amountBigA)
    setNeedsApprovalB(allowanceBigB < amountBigB)
  },[amountA,amountB,allowanceData,isError])


   // 用于授权的 hook
    const { 
      data: hash, 
      isPending, 
      writeContract,
      reset 
    } = useWriteContract()

    // 监听交易确认
    const { isLoading: isConfirming, isSuccess: isConfirmed } = 
      useWaitForTransactionReceipt({ hash })

    // 记录当前授权的是哪个代币
    const [approvingToken, setApprovingToken] = useState(null)

    // 授权 ETH
    const approveA = async () => {
      if (!amountA) return
      
      setApprovingToken('TKA')
      
      // 将用户输入的 ETH 数量转换成 wei
      const tokenAWei = parseUnits(amountA, 18)
      
      writeContract({
        address: tokenAddressA,      // ETH 代币合约地址
        abi: ERC20_ABI,                  // 使用标准的 ERC20 ABI
        functionName: 'approve',
        args: [
          swapAddress,                  // 池子合约地址（要授权的对象）
          tokenAWei                         // 授权金额
        ],
      })
    }

    // 授权 BNB
    const approveB = async () => {
      if (!amountB) return
      
      setApprovingToken('TKB')
      
      const tokenBWei = parseUnits(amountB, 18)
      
      writeContract({
        address: tokenAddressB,      // BNB 代币合约地址
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [swapAddress, tokenBWei],
      })
    }

    // 两个都授权完成后，再添加流动性
    const [isApprovedA, sethApprovedA] = useState(false)
    const [isApprovedB, sethApprovedB] = useState(false)

    // 监听授权成功
    useEffect(() => {
      if (isConfirmed && approvingToken === 'TKA') {
        sethApprovedA(true)
        setApprovingToken(null)
        setNeedsApprovalA(false)
        // reset()
      } else if (isConfirmed && approvingToken === 'TKB') {
        sethApprovedB(true)
        setApprovingToken(null)
        setNeedsApprovalB(false)
        // reset()
      }
    }, [isConfirmed, approvingToken])

  // 点击授权
  const handleApprove = () => {
    if(!amountA || !amountB){
      return
    }
    // 提示余额不足
    if(parseUnits(amountA.toString(),18) > balanceData[0].result || parseUnits(amountB.toString(),18) > balanceData[1].result){
      return alert('代币余额不足，无法添加')
    }
    // 授权
    if(needsApprovalA){
      approveA()
    }
    if(needsApprovalB){
      approveB()
    }
  }


  /* ---添加流动性-- */
  const { data: addHash, writeContract: addLiquidity, isPending: isAdding } = useWriteContract()

  const { isLoading: isAddConfirming, isSuccess: isAddSuccess } = useWaitForTransactionReceipt({
    hash: addHash
  })
  // 判断余额
  const handleAddLiquidity = () => {
    if(!amountA || !amountB || !swapAddress){
      return
    }
    // 提示余额不足
    if(parseUnits(amountA.toString(),18) > balanceData[0].result || parseUnits(amountB.toString(),18) > balanceData[1].result){
      return alert('代币余额不足，无法添加')
    }
    const amountAWei = parseUnits(amountA, 18)
    const amountBWei = parseUnits(amountB, 18)
    addLiquidity({
      address:swapAddress,
      abi:SWAP_ABI,
      functionName:'addLiquidity',
      args: [amountAWei,amountBWei]
    })
  }

  //监听添加成功刷新pool
  useEffect(() => {
    if(isAddSuccess){
      console.log('添加成功回调函数')
      // 状态重置
      setAmountA(0)
      setAmountB(0)
      updatePool?.()
    }
  },[isAddSuccess])
  return(
    <>
      {/* Token A Input */}
      <div className="mb-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-600">Token A</label>
            <button className="text-sm text-blue-600">
              {t('Balance')}: { balanceData && balanceData[0]?.result ? Number(formatUnits(balanceData[0]?.result,18)).toFixed(4) : 0} TKA
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
              {t('Balance')}: { balanceData && balanceData[1]?.result ? Number(formatUnits(balanceData[1]?.result,18)).toFixed(4) : 0} TKB
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
      {
        warnText && (
          <div className="text-orange-600 rounded-l text-l inline px-6">
            *{warnText}
          </div>
        )
      }

      {/* Price Info */}
      
      {/* Action Button - Add Liquidity with Dual Approval */}
      {/* 授权要授权TKA和TKB两种代币 */}
      {
        !isConnected ? (
          <CustomConnectBtn></CustomConnectBtn>
        ) : (needsApprovalA || needsApprovalB) ? (
          <button 
            onClick={handleApprove}
            disabled = {isPending || isConfirming}
            className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-tight rounded-lg mt-6 cursor-pointer disabled:bg-gray-400 disabled:text-white">
            { (isPending || isConfirming) ? t('"Approving') : t('Approve Token')}
          </button>
        )
         : (
          <button
            disabled={!amountA || !amountB || isAdding || isAddConfirming}
            onClick={handleAddLiquidity}
            className="bg-blue-100 text-blue-500 w-full cursor-pointer disabled:bg-gray-400 disabled:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            { (isAddConfirming || isAdding) ? t('Adding Liquidity') : t('Add Liquidity')}
          </button>
        )
      }

      {/* Success Message */}
      {isAddSuccess && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">{t('Liquidity Added Successfully')}!</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${addHash}`}
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
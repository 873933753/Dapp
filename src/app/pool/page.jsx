'use client'
import { ERC20_ABI, SWAP_ABI } from "@/lib/abis"
import { getProtocolAddress, getTokenAddress } from "@/lib/constants"
import { useEffect, useState } from "react"
import { formatUnits } from "viem"
import { useAccount , useChainId, useReadContract, useReadContracts } from "wagmi"
import AddForm from "./components/AddForm"
import RemoveForm from "./components/RemoveForm"
import PoolDash from "./components/PoolDash"

export default function PoolPage(){
  const chainId = useChainId()
  const swapAddress = getProtocolAddress(chainId, 'SWAP')
  const { address, isConnected } = useAccount()
  
  const [mode, setMode] = useState('add')
  
  /* 获取两种币种的余额 */
  /* const { data: tokenBalanceA, refetch: tokenBalanceARefetch } = useReadContract({
    address: getTokenAddress(chainId,'TKA'),
    abi: ERC20_ABI,
    functionName:'balanceOf',
    args: address ? [address] :undefined,
    enabled: Boolean(address)
  })

  const { data: tokenBalanceB, refetch: tokenBalanceBRefetch } = useReadContract({
    address: getTokenAddress(chainId,'TKB'),
    abi: ERC20_ABI,
    functionName:'balanceOf',
    args: address ? [address] :undefined,
    enabled: Boolean(address)
  }) */
  
  /* 同时读取多个合约 */
  const { data:balanceData, refetch: refetchBalances } = useReadContracts({
    contracts: [
      {
        address: getTokenAddress(chainId,'TKA'), // 合约 TKA 地址
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] :undefined,
        enabled: Boolean(address)
      },
      {
        address: getTokenAddress(chainId,'TKB'), // 合约 TKB 地址
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] :undefined,
        enabled: Boolean(address)
      },
    ],
  })

  /* 更新pool */
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const updatePool = () => {
    // 改变 refreshTrigger 触发子组件重新获取
    setRefreshTrigger(prev => prev + 1)
  }

  return(
    <div className="container max-w-2xl mx-auto py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Liquidity Pool</h1>
        <p className="text-gray-600">Add or remove liquidity to earn trading fees</p>
      </div>

      {/* Pool Stats */}
      <PoolDash
        chainId={chainId}
        swapAddress={swapAddress}
        refreshTrigger={refreshTrigger}  // 传下去
      />

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('add')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors cursor-pointer ${
              mode === 'add'
                ? 'bg-blue-100 text-blue-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Add Liquidity
          </button>
          <button
            onClick={() => setMode('remove')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors cursor-pointer ${
              mode === 'remove'
                ? 'bg-blue-100 text-blue-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Remove Liquidity
          </button>
        </div>


        {/* Add Liquidity Mode */}
        {mode === 'add' && (
          <AddForm
            chainId = { chainId }
            isConnected = {isConnected}
            balanceData = { balanceData }
            swapAddress = { swapAddress }
            address = { address }
            updatePool = {updatePool}
          />
        )}

        {/* Remove Liquidity Mode */}
        {mode === 'remove' && (
          <RemoveForm 
            chainId = { chainId }
            isConnected = {isConnected}
            swapAddress = { swapAddress }
            address = { address }
            updatePool = {updatePool}
          />
        )}

      </div>

      {/* Info Section */}
      <InfoSection />
    </div>
  )
}

function InfoSection(){
  return(
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">How it works</h3>
      <ul className="text-sm text-gray-600 space-y-1">
        <li>• Add liquidity in a 1:1 ratio to earn trading fees</li>
        <li>• Receive LP tokens representing your pool share</li>
        <li>• Remove liquidity anytime by burning LP tokens</li>
        <li>• Earn 0.3% fee on all swaps proportional to your share</li>
      </ul>
    </div>
  )
}
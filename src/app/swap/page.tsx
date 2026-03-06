'use client'
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useTranslations } from "next-intl"
import { useAccount, useChainId, useReadContract, useSimulateContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TOKENS, getTokenAddress, getProtocolAddress } from "@/lib/constants";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ERC20_ABI, SWAP_ABI } from "@/lib/abis";
// import { formatUnits, parseUnits } from "viem";
import { handleInputChange, handleKeyDown, handlePaste, formatUnits, parseUnits } from "@/lib/utils";
/* components */
import ApproveButton from "@/components/ApproveButton";
import InfoSection from './components/InfoSection';
import PriceInfo from './components/PriceInfo';
import SlippageModal from './components/SlippageModal';


function CustomConnectBtn() {
  const t = useTranslations('Swap')
  return (
    <ConnectButton.Custom>
      {/* 接收 RainbowKit 内置的状态和方法 */}
      {({
        account,        // 已连接的账户信息（address/ens等）
        chain,          // 当前链信息
        openAccountModal, // 打开账户弹窗的方法
        openConnectModal, // 打开连接弹窗的方法
        mounted,         // 组件是否挂载完成
      }) => {
        // 组件挂载完成前的加载状态
        const ready = mounted;
        const isConnected = ready && account && chain;
        return (
          <button
            onClick={openConnectModal}
            disabled={!mounted}
            className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-wider rounded-lg mt-6 hover:text-blue-600 hover:bg-blue-200 cursor-pointer"
          >
            {t('wallet')}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

const tokenSymbolTKA = 'TKA'
const slippagePresets = [0.1, 0.5, 1.0] 
export default function SwapPage(){
  const t = useTranslations('Swap')
  /* status: 'connecting' | 'reconnecting' | 'connected' | 'disconnected' */
  const { address:myAddress,isConnected,status } = useAccount()
  const [ tokenIn, setTokenIn ] = useState(tokenSymbolTKA)
  const [ tokenOut, setTokenOut ] = useState('')
  const [ amountIn, setAmountIn ] = useState('0')
  const [ amountOut, setAmountOut ] = useState('0')
  const chainId = useChainId()
  // DRT 和 USDC合约未部署，所以用的是mock数据
  const [ isMockMode, setIsMockMode ] = useState(false)
  const [ slippage, setSlippage ] = useState(slippagePresets[1]) // 滑点默认0.5%
  const [ showSlippageModal, setShowSlippageModal] = useState(false)

  // 解决钱包连接按钮闪烁问题
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // walletReady：等 wagmi 状态确定后再展示钱包相关 UI
  // 防止 mounted=true 但 wagmi 还没开始 reconnect 时闪现 Connect 按钮
  const [walletReady, setWalletReady] = useState(false)
  useEffect(() => {
    if (status === 'connected') {
      setWalletReady(true) // 已连接，立即就绪
    } else if (status === 'reconnecting' || status === 'connecting') {
      setWalletReady(false) // 正在重连，继续等
    } else {
      // status === 'disconnected'，可能是初始状态也可能是真正断开
      // 等 300ms 让 wagmi 有时间启动 reconnect
      const timer = setTimeout(() => setWalletReady(true), 300)
      return () => clearTimeout(timer)
    }
  }, [status])


  const tokenInData = useMemo(() => ({
    ...TOKENS[tokenIn],
    //tokenIn的代币合约地址
    address:getTokenAddress(chainId,tokenIn)
  }),[chainId,tokenIn])

  /* 
  否则依赖 - tokenOutData每次都会执行
  useMemo = 缓存计算结果（对象、数组、复杂计算）
  useCallback = 缓存函数引用（其实就是 useMemo(() => fn, deps) 的语法
  */
  const tokenOutData = useMemo(() => ({
    ...TOKENS[tokenOut],
    address:getTokenAddress(chainId,tokenOut)
  }),[chainId,tokenOut])

  const handleSwitchIn = (sympol:string) => {
    if( tokenOut === sympol ){
      setTokenOut('')
    }
    setTokenIn(sympol)
  }

  const handleSwitchOut = (sympol:string) => {
    if( tokenIn === sympol ){
      setTokenIn('')
    }
    setTokenOut(sympol)
  }

  const [error, setError] = useState<string | null>(null)
  const handleAmountIn = (e:React.ChangeEvent<HTMLInputElement>) => {
    let newValue = handleInputChange(e)
    // 超过余额
    if(parseUnits(newValue,tokenInData.decimals) > tokenBalance){
      setError('余额不足')
      return  // 直接 return，不改值
    }
    setError(null)
    setAmountIn(newValue)
  }

  const handleAmountOut = (e:React.ChangeEvent<HTMLInputElement>) => {
    const newValue = handleInputChange(e)
    setAmountOut(newValue)
  }

  const switchTokens = () => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    // 不仅币种需要交换，数值也需要交换，amountOut请求合约得出
    setAmountIn(amountOut)
    setAmountOut('')
  }

  // minAmountOut-- amount*(1-slippage/100)
  // const minAmountOut = amountOut ? (parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6) : '0'
  const minAmountOut = useMemo(() => {
    // 1. 边界值强校验：空值/非数字直接返回 '0'
    if (!amountOut || isNaN(parseFloat(amountOut)) || parseFloat(amountOut) <= 0) {
      return '0.000000'; // 统一返回6位小数，避免格式不一致
    }

    // 2. 滑点参数校验：防止负数/超大滑点导致异常
    const slippageNum = Number(slippage);
    const validSlippage = isNaN(slippageNum) || slippageNum < 0 || slippageNum > 100 
      ? 0 // 滑点异常时默认0
      : slippageNum;

    // 3. 高精度计算：避免 parseFloat 精度丢失（可选进阶优化）
    const amountOutNum = parseFloat(amountOut);
    const minAmount = amountOutNum * (1 - validSlippage / 100);

    // 4. 格式化：强制保留6位小数，且处理极小值（避免 0.0000001 显示为 0.000000）
    return minAmount <= 0 
      ? '0.000000' 
      : minAmount.toFixed(6);
  },[amountOut, slippage])

  /* 合约地址 */
  const swapAddress = getProtocolAddress(chainId, 'SWAP')

  // Read reserves from chain - 获取reserves,用于计算流动性
  const { data: reserves } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getReserves',
    query:{
      enabled: Boolean(swapAddress)
    }
  })

  // 读合约获取getAmountOut
  const { data: chainQuote, isError: isQuoteError } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getAmountOut',
    args: amountIn && tokenInData ? [ tokenInData.address, parseUnits(amountIn, tokenInData.decimals)] : undefined,
    // 合约地址有效 && amountIn有输入 && 输入金额是大于 0 的有效数字 才读取合约--避免无效请求，减少不必要的链上交互，降低前端资源消耗
    query:{
      enabled: Boolean(swapAddress && amountIn && parseFloat(amountIn) > 0)
    }
  })

  //获取余额
  const { data:tokenBalance,refetch: tokenBalanceRefetch } = useReadContract({
    address: tokenInData.address, // 代币合约地址
    abi: ERC20_ABI,
    functionName:'balanceOf',
    args:myAddress && tokenInData?.address ? [myAddress] : undefined
  })

  //授权成功回调函数
  const handleApproved = useCallback(() => {
    console.log('Token approved, ready to swap')
  },[])

  useEffect(() => {
    const getQuote = async () => {
      //没有输入或输入不合法
      if (!amountIn || parseFloat(amountIn) <= 0 || !tokenOut) {
        setAmountOut('')
        return
      }

      // 若链上有数据返回，DRT 和USDC 用的是mock数据
      if(chainQuote && !isQuoteError) {
        setAmountOut(formatUnits(chainQuote,tokenOutData.decimals))
        setIsMockMode(false)
        return
      }
      setIsMockMode(true)
    }

    const timer = setTimeout(getQuote, 500) // Debounce - 防抖
    return () => clearTimeout(timer)
  },[chainQuote, isQuoteError,amountIn, tokenOut, tokenOutData])
  
  /* 计算值 */
  // 计算价格影响
  const priceImpact = useMemo(() => {
    if(!reserves || !amountIn){
      return
    }
    const reserveValue = Number(reserves[tokenIn === tokenSymbolTKA ? 0 : 1])
    const amountInNum = parseFloat(amountIn)
    const impact = ((amountInNum / (reserveValue/1e18)) * 100).toFixed(2)
    return impact
  },[reserves,amountIn,tokenIn])

 /* swap */
  const { data: swapHash, writeContract: swap, isPending: isSwapping } = useWriteContract()
  const { isLoading: isSwapConfirming, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({
    hash:swapHash
  })

  /* 测试网水龙头：TKA 余额为 0 时可领取 10 TKA */
  const MINT_AMOUNT = 10n * 10n ** 18n // 10 TKA（18 位小数）

  // 读取当前用户剩余可领取额度
  const { data: remainingMintAmount } = useReadContract({
    address: tokenInData.address,
    abi: ERC20_ABI,
    functionName: 'remainingMintAmount',
    args: myAddress ? [myAddress] : undefined,
    query:{
     enabled: Boolean(myAddress && tokenIn === tokenSymbolTKA && tokenInData.address) 
    }
  })

  const { data: mintHash, writeContract: mintTKA, isPending: isMinting } = useWriteContract()
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintHash })

  const handleMintTKA = () => {
    if (!tokenInData.address) return
    mintTKA({
      address: tokenInData.address,
      abi: ERC20_ABI,
      functionName: 'mint',
      args: [MINT_AMOUNT],
    } as any)
  }

  // 领取成功后刷新余额
  useEffect(() => {
    if (isMintSuccess) tokenBalanceRefetch()
  }, [isMintSuccess,tokenBalanceRefetch])
  
  //发起swap
  const handleSwap = async() => {
    if(!amountIn || !amountOut || !swapAddress){
      return
    }   
    try {
      swap({
        address: swapAddress as `0x${string}`,
        abi: SWAP_ABI,
        functionName: 'swap',
        args: [tokenInData?.address as `0x${string}`, parseUnits(amountIn,18)] // 确保 args 必传且合法
      } as any,{
        onError:(err) => {
          console.log('err--',err)
        }
      });
    } catch (err) {
      console.error('Swap 交易失败详情：', err);
    }
  }

  // swap成功得回调 - handleSwapSuccess 引用不变 → useEffect 不会重复执行
  const handleSwapSuccess = useCallback(() => {
    //刷新余额
    tokenBalanceRefetch()
    setAmountIn('0')
    setAmountOut('0')
  },[tokenBalanceRefetch])

    // 监听交易成功
  useEffect(() => {
    if (isSwapSuccess) {
      handleSwapSuccess() // 通知父组件刷新
    }
  }, [isSwapSuccess,handleSwapSuccess])

  if (!mounted) {
    return (
      <div className="container max-w-lg mx-auto py-6 md:py-12 px-4">
        <div className="shadow-lg rounded-xl p-6 bg-card dark:border dark:border-border animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-6" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-2" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mt-6" />
        </div>
      </div>
    )
  }
  

  return(
    <div className="container max-w-lg mx-auto py-6 md:py-12 px-4">
      <div className="shadow-lg rounded-xl p-6 bg-card dark:border dark:border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-2xl">{t('title')}</h2>
          <button 
            onClick={() => setShowSlippageModal(true)}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer group"
          >
            <svg className="w-5 h-5 text-gray-600 group-hover:rotate-45 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        {/* token Input */}
        <div className={`rounded-2xl px-4 py-6 mt-6 relative ${!tokenIn?'bg-gray-200 dark:bg-gray-700':'bg-card'} border border-border ring-1 ring-border`}>
          <div className="flex justify-between text-l">
            <span>{t('from')}</span>
            {
              mounted && isConnected && tokenIn && (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-custom-primary">
                    {t('balance')}: {tokenBalance ? Number(formatUnits(tokenBalance, tokenInData.decimals)).toFixed(4) : 0} {tokenIn}
                  </span>
                  {/* 测试网水龙头：TKA 余额为 0 且合约允许领取时显示 */}
                  {tokenIn === tokenSymbolTKA && (!tokenBalance || tokenBalance === 0n) && remainingMintAmount > 0n && (
                    <button
                      onClick={handleMintTKA}
                      disabled={isMinting || isMintConfirming}
                      className="text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isMinting || isMintConfirming ? t('claiming') : t('claimTka')}
                    </button>
                  )}
                </div>
              )
            }
            
          </div>
          <div className={`flex justify-between items-center mt-4`}>
            <input
              disabled={!tokenIn}
              type="number"
              placeholder="0"
              className="text-2xl font-bold outline-none bg-transparent w-full appearance-none"
              onChange={handleAmountIn}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              value={amountIn}
            />
            <div className={`border px-0 rounded-2xl ml-4 ${!tokenIn?'bg-custom-primary border-custom-primary':''}`}>
              <Select onValueChange={handleSwitchIn} value={tokenIn} className='bg-custom-primary'>
                <SelectTrigger className={`[&>svg]:hidden flex items-center justify-between w-[110px] border-0 outline-0 focus-visible:ring-0 cursor-pointer font-bold text-lg data-[placeholder]:font-normal data-[placeholder]:text-sm ${!tokenIn?'data-[placeholder]:text-white':''}`}>
                  <SelectValue placeholder={t('select')} />
                  <div className="flex items-center">
                    <ChevronDown className={`h-4 w-4 opacity-100 ${!tokenIn?'text-white':''}`} />
                  </div>
                </SelectTrigger>
                <SelectContent className=''>
                  <SelectGroup>
                    {
                      Object.keys(TOKENS).map(symbol => {
                        return(
                          <SelectItem key={symbol} value={symbol} className=''>
                            {symbol}
                          </SelectItem>
                        )
                      })
                    }
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 翻转token */}
          <button
            className="bg-white dark:bg-gray-700 cursor-pointer border-4 border-gray-100 dark:border-gray-600 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors absolute left-1/2 -translate-x-1/2 z-10" 
            onClick={switchTokens}
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
        {/* token output */}
        <div className={`rounded-2xl px-4 py-6 mt-2 relative ${!tokenOut?'bg-gray-200 dark:bg-gray-700':'bg-card'} border border-border ring-1 ring-border`}>
          <div className="flex justify-between text-l">
            <span>{t('to')}</span>
          </div>
          <div className="flex justify-between items-center mt-4">
            <input
              // disabled={!tokenOut}
              disabled={true}
              type="number"
              placeholder="0"
              className="text-2xl font-bold outline-none bg-transparent w-full appearance-none"
              onChange={(e) => handleAmountOut(e)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              value={ amountOut }
            />
            <div className={`border px-0 rounded-2xl ml-4 ${!tokenOut?'bg-blue-500 border-blue-500':''}`}>
              <Select onValueChange={handleSwitchOut} value={tokenOut} className='bg-blue-500'>
                <SelectTrigger className={`[&>svg]:hidden flex items-center justify-between w-[110px] border-0 outline-0 focus-visible:ring-0 cursor-pointer font-bold text-lg data-[placeholder]:font-normal data-[placeholder]:text-sm ${!tokenOut?'data-[placeholder]:text-white':''}`}>
                  <SelectValue placeholder={t('select')} />
                  <div className="flex items-center">
                    <ChevronDown className={`h-4 w-4 opacity-100 ${!tokenOut?'text-white':''}`} />
                  </div>
                </SelectTrigger>
                <SelectContent className=''>
                  <SelectGroup>
                    {
                      /* 过滤tokenIn，使得两个币种不一样 */
                      Object.keys(TOKENS).filter(s => s !== tokenIn).map(symbol => {
                        return(
                          <SelectItem key={symbol} value={symbol} className=''>
                            {symbol}
                          </SelectItem>
                        )
                      })
                    }
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {
          amountOut !== '0' && amountOut !== '' && 
          <PriceInfo
            tokenIn={tokenIn}
            tokenOut = {tokenOut} 
            amountIn={amountIn}
            amountOut={amountOut}
            reserves = {reserves}
            priceImpact={priceImpact}
            slippage={slippage}
            minAmountOut={minAmountOut}
          />
        }
        { // mounted=false 或 wagmi 尚未确定连接状态，显示占位
          !mounted || !walletReady ? (
            <div className="w-full py-3 mt-6 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse h-12" />
          ) : !isConnected ? (
            <CustomConnectBtn></CustomConnectBtn>
          ) : isMockMode ? (
            <button className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-tight rounded-lg mt-6 hover:text-blue-600 hover:bg-blue-200 cursor-pointer">
              Swap (Mock Mode - Contract Not Deployed)
            </button>
          ) : (
            // <button className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-tight rounded-lg mt-6 hover:text-blue-600 hover:bg-blue-200 cursor-pointer">
            //   添加资金以进行交换
            // </button>
            <ApproveButton
              tokenAddress= {tokenInData?.address}
              spenderAddress = {swapAddress}
              amountIn = {amountIn ? parseUnits(amountIn,tokenInData.decimals) : 0n}
              amountOut = {amountOut}
              onApproved = { handleApproved}
              disabled = {!amountIn || !amountOut}
            >
              <button
                disabled={
                  !amountIn || !amountOut ||
                  parseFloat(amountIn) <= 0 ||
                  parseFloat(amountOut) <= 0 ||
                  isSwapConfirming || isSwapping
                }
                onClick={ handleSwap }
                className="bg-[var(--custom-btn-1)] border-blue-500 text-blue-500 w-full py-3 text-xl tracking-tight rounded-lg mt-6 cursor-pointer disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-white"
              >
                { isSwapping || isSwapConfirming ? 'Swaping...':t('title') }
              </button>
            </ApproveButton>
          )
        }

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

        {/* Success Message */}
        {isSwapSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold">Swap Successful!</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${swapHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View on Etherscan →
            </a>
          </div>
        )}
      </div>
      {/* Info Section */}      
      <InfoSection />
      {/* slippage */}
      {
        showSlippageModal && (
          <SlippageModal
            slippagePresets={slippagePresets}
            setShowSlippageModal={setShowSlippageModal}
            setSlippage={setSlippage}
            slippage={slippage}
          />
        )
      }
    </div>
  )
}



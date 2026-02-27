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
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ERC20_ABI, SWAP_ABI } from "@/lib/abis";
import { formatUnits, parseUnits } from "viem";
import { handleInputChange, handleKeyDown, handlePaste } from "@/lib/utils";
import ApproveButton from "@/components/ApproveButton";


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
        authenticated,   // 是否已认证（连接钱包）
        mounted,         // 组件是否挂载完成
      }) => {
        // 组件挂载完成前的加载状态
        const ready = mounted && authenticated;
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

export default function SwapPage(){
  const t = useTranslations('Swap')
  const { address:myAddress,isConnected } = useAccount()
  const [ tokenIn, setTokenIn ] = useState('TKA')
  const [ tokenOut, setTokenOut ] = useState('')
  const [ amountIn, setAmountIn ] = useState('0')
  const [ amountOut, setAmountOut ] = useState('0')
  const chainId = useChainId()
  // DRT 和 USDC合约未部署，所以用的是mock数据
  const [ isMockMode, setIsMockMode ] = useState(false)

  const slippagePresets = [0.1, 0.5, 1.0]
  const [ slippage, setSlippage ] = useState(slippagePresets[1]) // 滑点默认0.5%
  const [ showSlippageModal, setShowSlippageModal] = useState(false)

  const tokenInData = {
    ...TOKENS[tokenIn],
    //tokenIn的代币合约地址
    address:getTokenAddress(chainId,tokenIn)
  }
  const tokenOutData = {
    ...TOKENS[tokenOut],
    address:getTokenAddress(chainId,tokenOut)
  }

  const handleSwitchIn = (sympol) => {
    if( tokenOut === sympol ){
      setTokenOut('')
    }
    setTokenIn(sympol)
  }

  const handleSwitchOut = (sympol) => {
    if( tokenIn === sympol ){
      setTokenIn('')
    }
    setTokenOut(sympol)
  }

  const handleAmountIn = (e) => {
    let newValue = handleInputChange(e)
    // 超过余额
    if(parseUnits(newValue,tokenInData.decimals) > tokenBalance){
      alert('余额不足')
      newValue = formatUnits(tokenBalance,tokenInData.decimals)
    }
    setAmountIn(newValue)
  }

  const handleAmountOut = (e) => {
    const newValue = handleInputChange(e)
    setAmountOut(newValue)
  }

  const switchTokens = () => {
    const tokenA = tokenIn
    const tokenB = tokenOut
    setTokenIn(tokenB)
    setTokenOut(tokenA)
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
    enabled: Boolean(swapAddress)
  })

  // 读合约获取getAmountOut
  const { data: chainQuote, isError: isQuoteError } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getAmountOut',
    args: amountIn && tokenInData ? [ tokenInData.address, parseUnits(amountIn, tokenInData.decimals)] : undefined,
    // 合约地址有效 && amountIn有输入 && 输入金额是大于 0 的有效数字 才读取合约--避免无效请求，减少不必要的链上交互，降低前端资源消耗
    enabled: Boolean(swapAddress && amountIn && parseFloat(amountIn) > 0)
  })

  //获取余额
  const { data:tokenBalance,refetch: tokenBalanceRefetch } = useReadContract({
    address: tokenInData.address, // 代币合约地址
    abi: ERC20_ABI,
    functionName:'balanceOf',
    args:myAddress && tokenInData?.address ? [myAddress] : undefined
  })

  //授权成功回调函数
  const handleApproved = () => {
    console.log('Token approved, ready to swap')
  }

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
    const reserveValue = Number(reserves[tokenIn === 'TKA' ? 0 : 1])
    const amountInNum = parseFloat(amountIn)
    const impact = ((amountInNum / (reserveValue/1e18)) * 100).toFixed(2)
    return impact
  },[reserves,amountIn,tokenIn])


  //刷新余额
  useEffect(() => {
    tokenBalanceRefetch()
  },[tokenBalance,tokenInData])

  // swap成功得回调
  const handleSwapSuccess = () => {
    //刷新余额
    tokenBalanceRefetch()
    setAmountIn(0)
    setAmountOut(0)
  }


  return(
    <div className="container max-w-lg mx-auto py-6 md:py-12 px-4">
      <div className="shadow-lg rounded-xl p-6 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-2xl">Swap</h2>
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
        <div className={`rounded-2xl px-4 py-6 mt-6 relative ${!tokenIn?'bg-gray-200':'bg-white'}`}>
          <div className="flex justify-between text-l">
            <span>Sell</span>
            {
              tokenIn && (
                <span className="text-blue-600">
                  balance: { tokenBalance ? Number(formatUnits(tokenBalance, tokenInData.decimals)).toFixed(4) : 0} {tokenIn}
                </span>
              )
            }
            
          </div>
          <div className={`flex justify-between items-center mt-4`}>
            <input
              disabled={!tokenIn}
              type="number"
              placeholder="0"
              className="text-2xl font-bold outline-none bg-transparent w-full"
              onChange={(e) => handleAmountIn(e)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              value={amountIn}
            />
            <div className={`border px-0 rounded-2xl ml-4 ${!tokenIn?'bg-blue-500 border-blue-500':''}`}>
              <Select onValueChange={handleSwitchIn} value={tokenIn} className='bg-blue-500'>
                <SelectTrigger className={`[&>svg]:hidden flex items-center justify-between w-[110px] border-0 outline-0 focus-visible:ring-0 cursor-pointer font-bold text-lg data-[placeholder]:font-normal data-[placeholder]:text-sm ${!tokenIn?'data-[placeholder]:text-white':''}`}>
                  <SelectValue placeholder='选择代币' />
                  <div className="flex items-center">
                    <ChevronDown className={`h-4 w-4 opacity-100 ${!tokenIn?'text-white':''}`} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {
                      Object.keys(TOKENS).map(symbol => {
                        return(
                          <SelectItem key={symbol} value={symbol}>
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
            className="bg-white cursor-pointer border-4 border-gray-100 rounded-xl p-2 hover:bg-gray-50 transition-colors absolute left-1/2 -translate-x-1/2 z-10" 
            onClick={switchTokens}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
        {/* token output */}
        <div className={`rounded-2xl px-4 py-6 mt-2 relative ${!tokenOut?'bg-gray-200':'bg-white'}`}>
          <div className="flex justify-between text-l">
            <span>Buy</span>
          </div>
          <div className="flex justify-between items-center mt-4">
            <input
              // disabled={!tokenOut}
              disabled={true}
              type="number"
              placeholder="0"
              className="text-2xl font-bold outline-none bg-transparent w-full"
              onChange={(e) => handleAmountOut(e)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              value={ amountOut }
            />
            <div className={`border px-0 rounded-2xl ml-4 ${!tokenOut?'bg-blue-500 border-blue-500':''}`}>
              <Select onValueChange={handleSwitchOut} value={tokenOut} className='bg-blue-500'>
                <SelectTrigger className={`[&>svg]:hidden flex items-center justify-between w-[110px] border-0 outline-0 focus-visible:ring-0 cursor-pointer font-bold text-lg data-[placeholder]:font-normal data-[placeholder]:text-sm ${!tokenOut?'data-[placeholder]:text-white':''}`}>
                  <SelectValue placeholder='选择代币' />
                  <div className="flex items-center">
                    <ChevronDown className={`h-4 w-4 opacity-100 ${!tokenOut?'text-white':''}`} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {
                      /* 过滤tokenIn，使得两个币种不一样 */
                      Object.keys(TOKENS).filter(s => s !== tokenIn).map(symbol => {
                        return(
                          <SelectItem key={symbol} value={symbol}>
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
          amountOut!=0 && 
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
        {
          !isConnected ? (
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
              tokenInData = {tokenInData}
              swapAddress = { swapAddress }
              myAddress = {myAddress}
              onSwapSuccess={handleSwapSuccess}
            >
              {/* <button
                disabled={!amountIn || !amountOut}
                className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-tight rounded-lg mt-6 cursor-pointer disabled:bg-gray-400 disabled:text-white"
              >
                {'Swap'}
              </button> */}
            </ApproveButton>
          )
        }
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

/* Price Info */
function PriceInfo({tokenIn,tokenOut,amountIn, amountOut ,reserves, priceImpact, slippage, minAmountOut }){
  return(
    <div className="mb-4 space-y-2 mt-4">
      <div className="p-3 bg-blue-50 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          {/* 汇率：amountOut/amountIn -In能换多少out */}
          <span className="text-gray-600">Rate</span>
          <span className="font-semibold">
            1 {tokenIn} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)} {tokenOut}
          </span>
        </div>
        {reserves && (
          <>
            <div className="flex justify-between text-sm">
              {/* 流动性：(reserves[0] + reserves[1])/1e18 * 1.5 */}
              <span className="text-gray-600">Liquidity</span>
              <span className="font-semibold">
                {/* ${((Number(reserves[0]) + Number(reserves[1])) / 1e18 * 1.5).toFixed(2)} */}
                {calculateLiquidity(reserves[0],reserves[1],18)} LP
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price Impact</span>
              {/* 价格影响-priceImpact (amountIn/reserves[0])/ 1e18) * 100 or amountIn/reserves[1]  */}
              <span className={`font-semibold ${parseFloat(priceImpact) > 5 ? 'text-red-600' : parseFloat(priceImpact) > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                {priceImpact}%
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between text-sm">
          {/* 滑点数 */}
          <span className="text-gray-600">Slippage Tolerance</span>
          <span className="font-semibold">{slippage}%</span>
        </div>
        <div className="flex justify-between text-sm">
          {/* 最少收到: amountOut - (1 - slippage / 100) */}
          <span className="text-gray-600">Minimum Received</span>
          <span className="font-semibold">{minAmountOut} {tokenOut}</span>
        </div>
      </div>
      {parseFloat(priceImpact) > 5 && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800">⚠️ High price impact! Consider a smaller amount.</p>
        </div>
      )}
    </div>
  )
}


/* Info Section */
function InfoSection(){
  const t = useTranslations('Swap')
  return(
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">{t('info.title')}</h3>
      <ul className="text-sm text-gray-600 space-y-1">
        <li>• {t('info.first')}</li>
        <li>• {t('info.second')}</li>
        <li>• {t('info.third')}</li>
        <li>• {t('info.last')}</li>
      </ul>
    </div>
  )
}

/* slippageModal */
function SlippageModal({slippagePresets,setShowSlippageModal,setSlippage,slippage}){
  const [customSlippage, setCustomSlippage] = useState('')
  const handleCustomSlippage = (value) => {
    setCustomSlippage(value)
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      setSlippage(numValue)
    }
  }

  const handleSlippagePreset = (value) => {
    setSlippage(value)
    setCustomSlippage('')
  }
  return(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={() => setShowSlippageModal(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-3">Slippage Tolerance</label>
            <div className="flex gap-2 mb-3">
              {slippagePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSlippagePreset(preset)}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    slippage === preset && !customSlippage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                value={customSlippage}
                onChange={(e) => handleCustomSlippage(e.target.value)}
                placeholder="Custom"
                step="0.1"
                min="0"
                max={50}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-8"
              />
              <span className="absolute right-3 top-2 text-gray-500">%</span>
            </div>
            {customSlippage && parseFloat(customSlippage) > 5 && (
              <p className="mt-2 text-sm text-yellow-600">⚠️ High slippage may result in unfavorable rates</p>
            )}
            {customSlippage && parseFloat(customSlippage) > 15 && (
              <p className="mt-2 text-sm text-red-600">⚠️ Very high slippage! You may lose significant value.</p>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <strong>What is slippage?</strong>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Slippage is the difference between expected and actual trade price.
                Your transaction will revert if the price changes unfavorably by more than this percentage.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSlippageModal(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}


function bigIntSqrt(n) {
  // 边界值处理：0或1的平方根就是自身
  if (n < 0n) throw new Error('流动性计算错误：储备量乘积不能为负数');
  if (n === 0n || n === 1n) return n;

  // 二分法求解（BigInt 运算，全程无精度丢失）
  let low = 1n;
  let high = n;
  let result = 0n;

  while (low <= high) {
    const mid = (low + high) / 2n; // BigInt 整数除法
    const midSquared = mid * mid;  // 计算中间值的平方

    if (midSquared === n) {
      // 刚好是完全平方数，直接返回
      return mid;
    } else if (midSquared < n) {
      // 中间值平方小于目标值，记录当前值并往更大方向找
      result = mid;
      low = mid + 1n;
    } else {
      // 中间值平方大于目标值，往更小方向找
      high = mid - 1n;
    }
  }

  // 返回最接近的向下取整结果（满足LP计算精度要求）
  return result;
}


function calculateLiquidity(reserveA, reserveB, decimals) {
  // 1. 校验储备量不为0（无流动性时返回0）
  if (reserveA === 0n || reserveB === 0n) return '0.00';

  // 2. 计算两种代币储备量的乘积（BigInt 运算）
  const reserveProduct = reserveA * reserveB;

  // 3. 计算平方根（用手写的bigIntSqrt，无依赖）
  const liquidityRaw = bigIntSqrt(reserveProduct);

  // 4. 把BigInt类型的LP原始值转为人类可读数值（纯原生JS处理精度）
  // 原理：10^decimals 是精度系数，比如 18位精度 → 1e18
  const precision = BigInt(10 ** decimals);
  const liquidityHumanNum = Number(liquidityRaw) / Number(precision);

  // 5. 格式化保留2位小数（前端展示用）
  return liquidityHumanNum.toFixed(2);
}

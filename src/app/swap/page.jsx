'use client'
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useTranslations } from "next-intl"
import { useAccount, useChainId, useReadContract } from "wagmi";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TOKENS, getTokenAddress, getProtocolAddress } from "@/lib/constants";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

  const handleInputChange = (e) => {
    let inputValue = e.target.value;

    // 彻底移除所有负号（核心：禁止负数）
    inputValue = inputValue.replace(/-/g, "")
    // 1. 移除所有非数字和非小数点的字符
    inputValue = inputValue.replace(/[^0-9.]/g, "");
    
    // 2. 确保只有一个小数点
    const dotIndex = inputValue.indexOf(".");
    if (dotIndex !== -1) {
      inputValue = inputValue.slice(0, dotIndex + 1) + inputValue.slice(dotIndex + 1).replace(/\./g, "");
    }

    // 3. 处理开头的 0（如 00123 → 123，0.123 保留）
    if (inputValue.startsWith("0") && inputValue.length > 1 && !inputValue.startsWith("0.")) {
      inputValue = inputValue.replace(/^0+/, "");
    }

    // 4. 处理以小数点开头（如 .123 → 0.123）
    if (inputValue.startsWith(".")) {
      inputValue = "0" + inputValue;
    }

    // 5. 空值处理（避免显示 0 而非空）
    if (inputValue === "0" && e.target.value === "") {
      inputValue = "";
    }

    return inputValue
  };

  // 强化：拦截键盘输入负号（包括小键盘减号、快捷键等）
  const handleKeyDown = (e) => {
    // 禁止所有负号相关按键（-、_、小键盘减号）
    const forbiddenKeys = ["-", "_", "Minus"];
    if (forbiddenKeys.includes(e.key) || e.keyCode === 189 || e.keyCode === 109) {
      e.preventDefault(); // 直接阻止按键生效
    }
    // 同时禁止科学计数法相关字符（e/E），避免 1e-3 这类负数形式
    if (["e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // 兜底：防止通过粘贴/拖拽等方式传入负数（onPaste 增强）
  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData("text");
    // 若粘贴内容包含负号，直接阻止粘贴
    if (pastedText.includes("-")) {
      e.preventDefault();
      return;
    }
  };

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
  const { isConnected } = useAccount()
  const [ tokenIn, setTokenIn ] = useState('TKA')
  const [ tokenOut, setTokenOut ] = useState('')
  const [ amountIn, setAmountIn ] = useState('0')
  const [ amountOut, setAmountOut ] = useState('0')
  const chainId = useChainId()

  const slippagePresets = [0.1, 0.5, 1.0]
  const [ slippage, setSlippage ] = useState(slippagePresets[1])

  const tokenInData = {
    ...TOKENS[chainId],
    address:getTokenAddress(chainId,tokenIn)
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
    const newValue = handleInputChange(e)
    setAmountIn(newValue)
  }

  const handleAmountOut = (e) => {
    const newValue = handleInputChange(e)
    setAmountOut(newValue)
  }

  const handleSwapTokens = () => {
    const tokenA = tokenIn
    const tokenB = tokenOut
    setTokenIn(tokenB)
    setTokenOut(tokenA)
  }

  /* 合约地址 */
  const swapAddress = getProtocolAddress(chainId, 'SWAP')

  // Read reserves from chain - 获取reserves
  const { data: reserves } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getReserves'
  })
  console.log('reserves---',reserves)



  return(
    <div className="container max-w-lg mx-auto py-6 md:py-12 px-4">
      <div className="shadow-lg rounded-xl p-6 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-2xl">Swap</h2>
          <button className="p-2 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer group">
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
            <span>xxxx</span>
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
            onClick={handleSwapTokens}
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
              disabled={!tokenOut}
              type="number"
              placeholder="0"
              className="text-2xl font-bold outline-none bg-transparent w-full"
              onChange={(e) => handleAmountOut(e)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              value={amountOut}
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
        </div>
        {
          
        }
        <PriceInfo
          tokenIn={tokenIn}
          tokenOut = {tokenOut} 
          amountIn={amountIn}
          amountOut={amountOut}
          reserves = {[0,1]}
          priceImpact={0}
          slippage={slippage}
          minAmountOut={0}
        />
        {
          isConnected ? (
            <button className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-tight rounded-lg mt-6 hover:text-blue-600 hover:bg-blue-200 cursor-pointer">
              添加资金以进行交换
            </button>
          ) : (
            <CustomConnectBtn></CustomConnectBtn>
          )
        }
      </div>      
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
                ${((Number(reserves[0]) + Number(reserves[1])) / 1e18 * 1.5).toFixed(2)}
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
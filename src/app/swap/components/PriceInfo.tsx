import { useTranslations } from 'next-intl'
import { calculateLiquidity } from '@/lib/utils'

interface IPriceInfo {
  tokenIn:string,
  tokenOut:string,
  amountIn:string,
  amountOut:string,
  reserves: readonly [bigint,bigint] | undefined,
  priceImpact:string | undefined,
  slippage: number,
  minAmountOut: string
}
export default function PriceInfo({tokenIn,tokenOut,amountIn, amountOut ,reserves, priceImpact, slippage, minAmountOut }:IPriceInfo){
  const t = useTranslations('Swap.info')
  return(
    <div className="mb-4 space-y-2 mt-4">
      <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          {/* 汇率：amountOut/amountIn -In能换多少out */}
          <span className="text-gray-600 dark:text-gray-300">{t("Rate")}</span>
          <span className="font-semibold">
            1 {tokenIn} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)} {tokenOut}
          </span>
        </div>
        {reserves && (
          <>
            <div className="flex justify-between text-sm">
              {/* 流动性：(reserves[0] + reserves[1])/1e18 * 1.5 */}
              <span className="text-gray-600 dark:text-gray-300">{t("Liquidity")}</span>
              <span className="font-semibold">
                {/* ${((Number(reserves[0]) + Number(reserves[1])) / 1e18 * 1.5).toFixed(2)} */}
                {calculateLiquidity(reserves[0],reserves[1],18)} LP
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{t('Price Impact')}</span>
              {/* 价格影响-priceImpact (amountIn/reserves[0])/ 1e18) * 100 or amountIn/reserves[1]  */}
              <span className={`font-semibold ${parseFloat(priceImpact) > 5 ? 'text-red-600' : parseFloat(priceImpact) > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                {priceImpact}%
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between text-sm">
          {/* 滑点数 */}
          <span className="text-gray-600 dark:text-gray-300">{t('Slippage Tolerance')}</span>
          <span className="font-semibold">{slippage}%</span>
        </div>
        <div className="flex justify-between text-sm">
          {/* 最少收到: amountOut - (1 - slippage / 100) */}
          <span className="text-gray-600 dark:text-gray-300">{t('Minimum Received')}</span>
          <span className="font-semibold">{minAmountOut} {tokenOut}</span>
        </div>
      </div>
      {parseFloat(priceImpact) > 5 && (
        <div className="p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-xs text-red-800 dark:text-red-200">⚠️ {t('warning')}.</p>
        </div>
      )}
    </div>
  )
}
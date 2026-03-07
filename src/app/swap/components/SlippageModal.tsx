import { useTranslations } from 'next-intl'
import { useState } from 'react'

export default function SlippageModal({slippagePresets,setShowSlippageModal,setSlippage,slippage}){
  const t = useTranslations('Swap.slippage')
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{t('setting')}</h2>
          <button
            onClick={() => setShowSlippageModal(false)}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-3">{t('slippage')}</label>
            <div className="flex gap-2 mb-3">
              {slippagePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSlippagePreset(preset)}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    slippage === preset && !customSlippage
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
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
                placeholder={t("custom")}
                step="0.1"
                min="0"
                max={50}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-8"
              />
              <span className="absolute right-3 top-2 text-muted-foreground">%</span>
            </div>
            {customSlippage && parseFloat(customSlippage) > 5 && (
              <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">⚠️ High slippage may result in unfavorable rates</p>
            )}
            {customSlippage && parseFloat(customSlippage) > 15 && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">⚠️ Very high slippage! You may lose significant value.</p>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3">
              <p className="text-sm text-muted-foreground dark:text-blue-100">
                <strong>{t('title')}</strong>
              </p>
              <p className="text-xs text-muted-foreground dark:text-blue-200 mt-1">
                {t('explain')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSlippageModal(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  )
}
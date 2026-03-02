'use client'

import { useTransition } from "react"
import { setUserLocale } from "@/i18n/service"
import { useLocale } from "next-intl"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { locales } from "@/i18n/config"

export default function LocaleSwitcher(){
  const [ isPending, startTransition ] = useTransition()
  const locale = useLocale()

  const handleSwitch = (locale) => {
    startTransition(() => {
      setUserLocale(locale)
    })
  }

  return(
    <div>
      {/* <Select onValueChange={handleSwitch} defaultValue={locale} disabled={isPending}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {
              locales.map(localeItem => {
                return(
                  <SelectItem key={localeItem} value={localeItem}>
                    {localeItem == 'zh-CN'?'中文':'English'}
                  </SelectItem>
                )
              })
            }
          </SelectGroup>
        </SelectContent>
      </Select> */}
      {/* <div className="flex items-center bg-gray-100 rounded-lg p-1 w-fit"> */}
        {/* 单一图标按钮：根据当前语言显示不同表情，点击切换 */}
        <button
          disabled={isPending}
          onClick={() => handleSwitch(locale === 'en' ? 'zh-CN' : 'en')}
          aria-label={locale === 'en' ? '切换到中文' : 'Switch to English'}
          title={locale === 'en' ? '切换到中文 — 🐼' : 'Switch to English — 🤡'}
          className={`p-2 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${locale === 'en' ? 'text-blue-500' : 'text-gray-600 hover:text-gray-800'} dark:bg-gray-700 text-gray-800 dark:text-gray-200`}
        >
          <span className="select-none w-5 h-5">{locale === 'en' ? 'EN' : 'Zh'}</span>
        </button>
      {/* </div> */}
    </div>
  )
}

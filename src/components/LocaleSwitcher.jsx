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
      <div className="flex items-center bg-gray-100 rounded-lg p-1 w-fit">
        {/* EN 按钮 */}
        <button
          disabled={isPending}
          onClick={() => handleSwitch('en')}
          className={`
            px-4 py-2 rounded-md text-l font-medium cursor-pointer
            transition-all duration-300 ease-in-out
            ${locale === 'en' 
              ? 'bg-white text-blue-500 shadow-md scale-102' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200 scale-100'
            }
          `}
        >
          EN
        </button>

        {/* 中文按钮 */}
        <button
          disabled={isPending}
          onClick={() => handleSwitch('zh-CN')}
          className={`
           px-4 py-2 rounded-md text-l font-medium cursor-pointer
           transition-all duration-300 ease-in-out
            ${locale === 'zh-CN' 
              ? 'bg-white text-blue-500 shadow-md scale-102' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200 scale-100'
            }
          `}
        >
          中文
        </button>
      </div>
    </div>
  )
}

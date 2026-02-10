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
      <Select onValueChange={handleSwitch} defaultValue={locale} disabled={isPending}>
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
      </Select>
    </div>
  )

}
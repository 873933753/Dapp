'use client'

import { ConnectButton } from "@rainbow-me/rainbowkit"
import LocaleSwitcher from "./LocaleSwitcher"
import ThemeSwitcher from "./ThemeSwitcher"
import { useTranslations } from "next-intl"
import { featureList as navlist } from "@/config/list"
import Link from "next/link"
import { usePathname } from 'next/navigation'; // 客户端获取路径
// import LanguageSwitcher from "./LanguageSwitcher"

export default function NavBar(){
  const t = useTranslations('Wallet')
  const tn = useTranslations('navigation')
  const pathname = usePathname()
  return(
    <div className="border-b border-border flex justify-center">
      <div className="container py-4 px-2 flex justify-between">
        <div className="flex items-center">
            {/* <span className="text-m md:text-2xl font-bold text-primary">DeFi DApp</span> */}
             <span className="text-m md:text-2xl font-bold text-primary">DApp</span>
            {/* 移动端优点hidden，否则flex布局 */}
            <div className="hidden md:flex items-center">
              {
                navlist.map(navItem => {
                  const isActive = pathname === navItem.href;
                  return (
                    <Link
                      href={navItem.href}
                      key={navItem.name}
                      className={`
                        mx-4 select-none text-sm cursor-pointer
                        ${navItem.disNav?'hidden':''}
                        ${
                          isActive
                            ? 'text-primary font-bold opacity-100'
                            : 'text-foreground opacity-70 hover:opacity-100 hover:text-primary'
                        }
                      `}
                    >
                      {tn(navItem.name)}
                    </Link>
                  )
                })
              }
            </div>
        </div>
        {/* <LanguageSwitcher /> */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeSwitcher />
          {/* <button>链接钱包</button> */}
          <ConnectButton
            label={t('button')}
            showBalance={true}
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
           />
        </div>
      </div>
    </div>
  )
}
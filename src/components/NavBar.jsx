'use client'

import { useEffect, useState } from "react"
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const visibleNavItems = navlist.filter(navItem => !navItem.disNav)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    // matchMedia to detect small screens and hide balance on mobile
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsSmallScreen(e.matches)
    // set initial
    setIsSmallScreen(mq.matches)
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else mq.addListener(handler)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else mq.removeListener(handler)
    }
  }, [])

  const desktopLinkBase = `
    relative mx-4 select-none text-sm cursor-pointer border-b-2 transition-colors ease-out duration-200
  `
  const mobileMenuWrapper = `
    absolute left-0 top-full w-full border-b border-border bg-background shadow-md md:hidden z-10 overflow-hidden transition-all duration-300 ease-out transform
    ${isMenuOpen ? 'max-h-64 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'}
  `

  return(
    <div className="border-b border-border flex justify-center">
      <div className="container relative py-4 px-2 flex justify-between">
        <div className="flex items-center">
            {/* logo image ahead of title */}
            <img src="/hanber.png" alt="hanber" className="h-8 w-8 mr-1" />
            <span className="text-m md:text-xl font-bold text-blue-500">DApp</span>
            {/* 移动端优点hidden，否则flex布局 */}
            <div className="hidden md:flex items-center">
              {
                visibleNavItems.map(navItem => {
                  const isActive = pathname === navItem.href;
                  return (
                    <Link
                      href={navItem.href}
                      key={navItem.name}
                      className={`${desktopLinkBase} ${
                        isActive
                          ? 'text-primary border-primary'
                          : 'text-foreground opacity-70 border-transparent hover:opacity-100 hover:text-primary'
                      }`}
                    >
                      {tn(navItem.name)}
                    </Link>
                  )
                })
              }
            </div>
            <button
              type="button"
              className={`md:hidden ml-4 inline-flex items-center justify-center rounded border border-border p-2 ${isMenuOpen ? 'text-primary' : 'text-foreground'}`}
              aria-label={tn('menu')}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(prev => !prev)}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
        </div>
        {/* <LanguageSwitcher /> */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeSwitcher />
          {/* Wallet button: wrap and scale down on small screens to avoid covering menu */}
          <div className="min-w-0 md:min-w-auto md:transform-none transform scale-90 md:scale-100 md:ml-0 ml-2">
            <ConnectButton
              label={t('button')}
              showBalance={!isSmallScreen}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
        <div className={mobileMenuWrapper}>
          <div className="flex flex-col px-4 py-3 space-y-1">
            {
              visibleNavItems.map(navItem => {
                const isActive = pathname === navItem.href;
                return (
                  <Link
                    href={navItem.href}
                    key={`mobile-${navItem.name}`}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground opacity-80 hover:opacity-100 hover:bg-primary/5'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {tn(navItem.name)}
                  </Link>
                )
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
}
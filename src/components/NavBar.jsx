'use client'

import { useEffect, useState } from "react"
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit"
import LocaleSwitcher from "./LocaleSwitcher"
import ThemeSwitcher from "./ThemeSwitcher"
import { useTranslations } from "next-intl"
import { featureList as navlist } from "@/config/list"
import Link from "next/link"
import { usePathname } from 'next/navigation'; // 客户端获取路径
import { useConnect, useAccount } from "wagmi"
// import LanguageSwitcher from "./LanguageSwitcher"

export default function NavBar(){
  const t = useTranslations('Wallet')
  const tn = useTranslations('navigation')
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const visibleNavItems = navlist.filter(navItem => !navItem.disNav)

  // WalletConnect 专用连接
  const { connect, connectors } = useConnect()
  const { isConnected, address } = useAccount() // 获取连接状态和地址
  const wcConnector = connectors.find(c => c.id === 'walletConnect')
  
  // 监听连接状态变化
  useEffect(() => {
    if (isConnected && address) {
      // console.log('🎉 钱包连接成功！地址:', address)
    }
  }, [isConnected, address])
  
  const handleWalletConnectClick = async () => {
    if (!wcConnector) {
      console.warn('WalletConnect 连接器未找到')
      return
    }
    
    console.log('🔄 开始 WalletConnect 连接流程...')
    
    try {
      console.log('📱 请用手机钱包扫描二维码，并在手机上确认连接')
      await connect({ connector: wcConnector })
      console.log('✅ WalletConnect 连接成功！')
    } catch (error) {
      console.error('❌ WalletConnect 连接失败:', error)
      
      // 提供用户友好的错误提示
      if (error.message?.includes('rejected') || error.message?.includes('denied')) {
        console.log('💡 用户取消了连接，请重试并在手机上确认连接')
      } else if (error.message?.includes('timeout')) {
        console.log('💡 连接超时，请确保手机和电脑在同一网络，并重试')
      }
    }
  }

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
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-border flex justify-center bg-background">
      <div className="container relative py-4 px-2 flex justify-between">
        <div className="flex items-center">
            {/* logo + title link to home */}
            <Link href="/" aria-label="Home" className="flex items-center hover:opacity-90">
              <img src="/hanber.png" alt="hanber" className="h-8 w-8 mr-1" />
              <span className="text-m md:text-xl font-bold text-blue-500">DApp</span>
            </Link>
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
          {/* WalletConnect 二维码扫码按钮 - 仅在未连接时显示 */}
          {!isConnected && (
            <button 
              onClick={handleWalletConnectClick}
              className="p-2 rounded-md transition-colors duration-200 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              title="WalletConnect 扫码连接"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h4v4H3V3zm6 0h4v4H9V3zm6 0h4v4h-4V3zM3 9h4v4H3V9zm6 0h4v4H9V9zm6 0h4v4h-4V9zM3 15h4v4H3v-4zm6 0h4v4H9v-4zm6 0h4v4h-4v-4z"/>
              </svg>
            </button>
          )}
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
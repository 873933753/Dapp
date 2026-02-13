import { ConnectButton } from "@rainbow-me/rainbowkit"
import LocaleSwitcher from "./LocaleSwitcher"
import { useTranslations } from "next-intl"
import { featureList as navlist } from "@/config/list"
// import LanguageSwitcher from "./LanguageSwitcher"

export default function NavBar(){
  const t = useTranslations('Wallet')
  return(
    <div className="border-b border-gray-200 flex justify-center">
      <div className="container py-4 px-2 flex justify-between">
        <div className="flex items-center">
            <span className="text-m md:text-2xl font-bold text-blue-500">DeFi DApp</span>
            {/* 移动端优点hidden，否则flex布局 */}
            <div className="hidden md:flex items-center">
              {
                navlist.map(navItem => {
                  return <span key={navItem.name} className={`mx-4 text-gray-500 text-sm cursor-pointer ${navItem.disNav?'hidden':''}`}>{navItem.name}</span>
                })
              }
            </div>
        </div>
        {/* <LanguageSwitcher /> */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
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
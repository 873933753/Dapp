'use client'

import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,darkTheme 
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmiConfig";
import { mainnet } from 'viem/chains';
import { useLocale  } from 'next-intl';
// import { useLanguageStore } from '@/store/languageStore';


export default function Web3Provider({children}){
  const queryClient = new QueryClient();
  
  const locale = useLocale()

  // 获取全局语言状态
  // const { locale } = useLanguageStore();
  // 适配 RainbowKit 主题（可选，可自定义）
  const theme = darkTheme({
    accentColor: 'lab(54.1736% 13.3368 -74.6839)',
    accentColorForeground: 'white',
  });
  
  return(
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* 设置为紧凑型 */}
        <RainbowKitProvider
          modalSize="compact"
          theme={theme}
          initialChain={mainnet}
          locale={locale}
         >
          { children }
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
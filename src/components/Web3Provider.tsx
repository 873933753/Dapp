'use client'

import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider, darkTheme, lightTheme 
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
// import { wagmiConfig } from "@/lib/wagmiConfig";
import { wagmiConfig } from "@/lib/wagmiConfig-minimal";
import { mainnet,sepolia } from 'viem/chains';
import { useLocale  } from 'next-intl';
import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/themeStore';
// import { useLanguageStore } from '@/store/languageStore';


export default function Web3Provider({children}){
  const queryClient = new QueryClient();
  
  const locale = useLocale()
  // read theme value from store (not to confuse with RainbowKit theme)
  const themeMode = useThemeStore((s) => s.theme);
  const [rpcError, setRpcError] = useState(null);

  // 添加/移除 .dark 类以用于 tailwind dark variants
  // 使用 documentElement 与 layout 的首屏脚本保持一致，避免刷新时主题闪烁
  useEffect(() => {
    const target = document.documentElement;
    if (themeMode === 'dark') {
      target.classList.add('dark');
    } else {
      target.classList.remove('dark');
    }
  }, [themeMode]);

  // 简单的 RPC 健康检查：在前端给出节点不可用 / 未授权等提示
  useEffect(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA || 'https://sepolia.infura.io/v3/';
    if (!rpcUrl) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_blockNumber',
            params: [],
          }),
        });

        if (!res.ok) {
          if (cancelled) return;

          if (res.status === 401) {
            setRpcError('RPC 节点返回 401 未授权。请检查 RPC URL 和访问权限。');
          } else {
            setRpcError(`RPC 节点返回错误状态 ${res.status}`);
          }

          return;
        }

        const data = await res.json();
        if (data?.error) {
          if (cancelled) return;
          setRpcError(`RPC 节点错误：${data.error.message || '未知错误'}`);
        }
      } catch (err) {
        if (cancelled) return;
        setRpcError(`无法连接 RPC 节点：${err.message}`);
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  // 获取全局语言状态
  // const { locale } = useLanguageStore();
  // 适配 RainbowKit 主题：跟随亮/暗模式，accentColor 与项目蓝色按钮一致
  const theme = themeMode === 'dark'
    ? darkTheme({
        accentColor: '#2563eb',          // blue-600
        accentColorForeground: 'white',
      })
    : lightTheme({
        accentColor: '#dbeafe',          // blue-100
        accentColorForeground: '#3b82f6', // blue-500
      });
  
  return(
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* 设置为紧凑型 */}
        <RainbowKitProvider
          // modalSize="compact"
          theme={theme}
          initialChain={sepolia}
          locale={locale as any}
         >
          {rpcError && (
            <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-between gap-2 border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-500 backdrop-blur-sm">
              <span className='flex-1 pt-2 text-center'>⚠️ RPC 节点异常：{rpcError}。请检查网络连接或 RPC 配置。</span>
              <button
                onClick={() => setRpcError(null)}
                className="ml-4 shrink-0 rounded px-2 py-0.5 hover:bg-red-500/20"
                aria-label="关闭"
              >✕</button>
            </div>
          )}
          { children }
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
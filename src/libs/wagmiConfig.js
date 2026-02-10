import { createConfig, http, injected } from '@wagmi/core'
import { mainnet, sepolia } from '@wagmi/core/chains'
import { walletConnect } from 'wagmi/connectors'

const USE_CUSTOM_RPC = true
const rpc_sepolia = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA
const rpc_mainnet = process.env.NEXT_PUBLIC_RPC_MAINNET_URL

const chainsConfig = USE_CUSTOM_RPC ? {
  ...sepolia,
  rpcUrls:{
    default: { http: [rpc_sepolia]},
    public: { http: [rpc_sepolia]}
  }
}:mainnet

const transports = USE_CUSTOM_RPC ? {
  [sepolia.id]:http(rpc_sepolia)
}:{
  [sepolia.id]: http(rpc_mainnet)
}

// 3、walletConnect二维码连接 - 注册reown
const connectors = [
  injected(), //浏览器插件注入方式
  walletConnect({ //扫码连接
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: 'lucky', // 必选：DApp 名称
      description: 'lucky Website', // 可选：描述
      url: 'https://learn-web3-frontend.com',// 必选：DApp 官网地址
      icons: ['https://avatars.githubusercontent.com/u/37784886'] // 必选：图标 URL 数组 256*256
    }
  })
]

export const wagmiConfig = createConfig({
  chains:[chainsConfig,mainnet],
  transports,
  // connectors,
  ssr:true
})
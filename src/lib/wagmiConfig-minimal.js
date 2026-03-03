import { createConfig, http } from '@wagmi/core'
import { mainnet, sepolia } from '@wagmi/core/chains'
import { injected, walletConnect } from '@wagmi/connectors'

// 基础配置
const USE_CUSTOM_RPC = true
const rpc_sepolia = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA || 'https://sepolia.infura.io/v3/'

const chainsConfig = {
  ...sepolia,
  rpcUrls: {
    default: { http: [rpc_sepolia] },
    public: { http: [rpc_sepolia] }
  }
}

const transports = {
  [sepolia.id]: http(rpc_sepolia),
  [mainnet.id]: http()
}

// 极简 WalletConnect 配置
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
console.log('🔑 Project ID 状态:', projectId ? '✅已设置' : '❌未设置')

const connectors = [injected()]

// 最小配置的 WalletConnect - 避免任何可能的冲突
if (projectId) {
  try {
    const wcConnector = walletConnect({
      projectId: projectId,
      showQrModal: true,
      metadata: {
        name: 'DApp',
        description: 'Web3 DApp',
        url: 'https://dapp-chi-five.vercel.app',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    })
    
    connectors.push(wcConnector)
    console.log('✅ WalletConnect 已添加')
  } catch (error) {
    console.error('❌ WalletConnect 添加失败:', error)
  }
}

export const wagmiConfig = createConfig({
  chains: [chainsConfig, mainnet],
  transports,
  connectors,
  ssr: true
})
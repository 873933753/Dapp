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

// 验证 Project ID 格式 (应该是32位十六进制字符)
if (projectId) {
  const isValidFormat = /^[0-9a-f]{32}$/.test(projectId)
  console.log('🔍 Project ID 格式:', isValidFormat ? '✅有效' : '❌无效 (应该是32位十六进制)')
}

const connectors = [injected()]

// 超级简化的 WalletConnect 配置
if (projectId && projectId.length === 32) {
  try {
    const wcConnector = walletConnect({
      projectId: projectId,
      showQrModal: true,
      metadata: {
        name: 'Hanber Defi',
        description: 'Hanber’s DApp',
        url: 'https://dapp-chi-five.vercel.app/',
        icons: ['https://dapp-chi-five.vercel.app/hanber.png']
      }
    })
    
    connectors.push(wcConnector)
    console.log('✅ 超简化 WalletConnect 已添加')
    console.log('💡 如果仍有问题，请尝试：')
    console.log('1. 使用 Trust Wallet 而不是 MetaMask')
    console.log('2. 确保手机和电脑在同一 WiFi 网络')
    console.log('3. 重启手机上的钱包 app')
  } catch (error) {
    console.error('❌ WalletConnect 添加失败:', error)
  }
} else {
  console.warn('⚠️ Project ID 无效或未设置')
}

export const wagmiConfig = createConfig({
  chains: [chainsConfig, mainnet],
  transports,
  connectors,
  ssr: true
})
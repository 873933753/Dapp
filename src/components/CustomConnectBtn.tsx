import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useTranslations } from "next-intl"

export default function CustomConnectBtn({type='Swap'}) {
  const t = useTranslations(type)
  return (
    <ConnectButton.Custom>
      {/* 接收 RainbowKit 内置的状态和方法 */}
      {({
        account,        // 已连接的账户信息（address/ens等）
        chain,          // 当前链信息
        openAccountModal, // 打开账户弹窗的方法
        openConnectModal, // 打开连接弹窗的方法
        authenticated,   // 是否已认证（连接钱包）
        mounted,         // 组件是否挂载完成
      }) => {
        // 组件挂载完成前的加载状态
        const ready = mounted && authenticated;
        const isConnected = ready && account && chain;
        return (
          <button
            onClick={openConnectModal}
            disabled={!mounted}
            className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-wider rounded-lg mt-6 hover:text-blue-600 hover:bg-blue-200 cursor-pointer"
          >
            {t('wallet')}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
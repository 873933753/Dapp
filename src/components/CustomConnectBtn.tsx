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
        authenticationStatus,   // 认证状态
        mounted,         // 组件是否挂载完成
      }) => {
        // 组件挂载完成前的加载状态
        const ready = mounted && authenticationStatus !== 'loading';
        const isConnected = ready && account && chain;
        return (
          <button
            onClick={openConnectModal}
            disabled={!mounted}
            className="btn-action w-full py-2 text-lg tracking-wider rounded-lg mt-6"
          >
            {t('wallet')}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
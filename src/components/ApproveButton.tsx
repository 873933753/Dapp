import { ERC20_ABI,SWAP_ABI } from "@/lib/abis"
import { useState, useEffect } from "react"
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi"

export default /* 代币使用授权(当前钱包向合约授权)
1）前端检测授权状态 - 调用ERC20代币合约的allowance检查用户地址是否授权该地址使用代币以及额度是否够用,allowanceAmount<amountIn 出发授权流程（如果alloance>amountIn不用授权合约可以直接划走）
2）发起授权，调用ERC20代币合约的approce方法，发起链上交易
*/
function ApproveButton({
  tokenAddress,
  spenderAddress,
  amountIn,
  amountOut,
  onApproved,
  children,
  disabled=false
}){
  const { address: ownerAddress } = useAccount()
  //判断是否需要授权
  const [needsApproval, setNeedsApproval] = useState(false)

  // 获取授权额度，额度 < 输入才需要再次授权
  const { data: allowance, refetch: refetchAllowance} = useReadContract({
    address: tokenAddress, // 代币合约地址
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ ownerAddress, spenderAddress ] : undefined, // 参数：授权人地址、被授权合约地址
    enabled: Boolean(ownerAddress && spenderAddress && tokenAddress && amountIn)
  })


  /* approve  transaction*/
  const { data: writeHash, writeContract: approve, isPending : isApproving } = useWriteContract()
  //授权状态
  const { isLoading: isConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({
    hash : writeHash
  })

  const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

  // 发起授权
  const handleApprove = () => {
    if(!tokenAddress || !spenderAddress || disabled){
      return
    }
    approve({ 
      address:tokenAddress,
      abi:ERC20_ABI,
      functionName:'approve',
      // args:[ spenderAddress, amountIn]
      args:[ spenderAddress, maxUint256] // 授权额度无上限
    })
  }


  useEffect(() => {
    //如果金额还未输入，授权额度也未读取，还不用授权
    if(amountIn === undefined || amountIn === null || allowance === undefined || allowance === null){
      setNeedsApproval(false)
      return
    }
    const amountBig = typeof amountIn === 'bigint' ? amountIn : BigInt(amountIn || 0)
    const allowanceBig = BigInt(allowance)
    // allowanceBig < amountBig 需要发起授权,否则无须发起授权
    setNeedsApproval(allowanceBig < amountBig)
  },[amountIn,allowance])
  

   // 授权成功
  useEffect(() => {
    if(isApproved){
      refetchAllowance() // 重新获取授权额度，用于展示
      // 执行一个可选的回调函数（onApproved），通知外部“授权已完成”
      onApproved?.()
    }
  },[isApproved, onApproved, refetchAllowance])

  //如果不需要授权，则可以swap
  if(!needsApproval){
    return children
  }

  return(
    <>
      {
        needsApproval ? (
          <button 
            // disabled = { !amountIn || !amountOut || isApproving || isConfirming}
            disabled={disabled || isApproving || isConfirming}
            onClick = { handleApprove }
            className="bg-blue-100 text-blue-500 w-full py-3 text-xl tracking-tight rounded-lg mt-6 cursor-pointer disabled:bg-gray-400 disabled:text-white">
            { (isApproving || isConfirming) ? "Approving..." : "Approve Token"}
          </button>
        ) : null
      }
    </>
  )
}
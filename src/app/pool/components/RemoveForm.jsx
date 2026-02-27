export default function RemoveForm(){
  return(
    <>
      {/* LP Token Input */}
      <div className="mb-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-600">LP Tokens</label>
            <button className="text-sm text-blue-600">
              {/* Balance: {lpBalance ? formatUnits(lpBalance, 18, 4) : '0'} */}

            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={0}
              placeholder="0.0"
              className="flex-1 text-2xl font-semibold bg-transparent outline-none"
            />
            <div className="bg-white border rounded-lg px-3 py-2 font-semibold">
              LP
            </div>
          </div>
        </div>
      </div>

      {/* Arrow Down */}
      <div className="flex justify-center -my-2 relative z-10">
        <div className="bg-white border-4 border-gray-50 rounded-xl p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* Output Amounts */}
      <div className="mb-6 space-y-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-1">You will receive</div>
          <div className="text-xl font-semibold">{0} TKA</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-1">You will receive</div>
          <div className="text-xl font-semibold">{0} TKB</div>
        </div>
      </div>

      {/* Action Button */}
      {/* {!isConnected ? (
        <button className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg">
          Connect Wallet
        </button>
      ) : !swapAddress || isMockMode ? (
        <button
          disabled
          className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
        >
          {isMockMode ? 'Remove Liquidity (Mock Mode - Contract Not Deployed)' : 'Swap Contract Not Available'}
        </button>
      ) : (
        <button
          onClick={handleRemoveLiquidity}
          disabled={!lpAmount || isRemoving || isRemoveConfirming}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {isRemoving || isRemoveConfirming ? 'Removing Liquidity...' : 'Remove Liquidity'}
        </button>
      )} */}

      {/* Success Message */}
      {/* {isRemoveSuccess && (
        <div  ="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">Liquidity Removed Successfully!</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${removeHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View on Etherscan →
          </a>
        </div>
      )} */}
    </>
  )
}
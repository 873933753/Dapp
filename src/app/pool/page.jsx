export default function PoolPage(){
  const mode = 'add'
  return(
    <div className="container max-w-2xl mx-auto py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Liquidity Pool</h1>
        <p className="text-gray-600">Add or remove liquidity to earn trading fees</p>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="text-sm opacity-90 mb-1">Total TVL</div>
          <div className="text-2xl font-bold">
            xxx
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="text-sm opacity-90 mb-1">Reserve A</div>
          <div className="text-2xl font-bold">
            
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="text-sm opacity-90 mb-1">Reserve B</div>
          <div className="text-2xl font-bold">
             TKB
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <button
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              mode === 'add'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Add Liquidity
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              mode === 'remove'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Remove Liquidity
          </button>
        </div>


        {/* Add Liquidity Mode */}
        {mode === 'add' && (
          <>
            {/* Token A Input */}
            <div className="mb-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-600">Token A</label>
                  <button className="text-sm text-blue-600">
                    Balance: 
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
                    TKA
                  </div>
                </div>
              </div>
            </div>

            {/* Plus Icon */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white border-4 border-gray-50 rounded-xl p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>

            {/* Token B Input */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-600">Token B</label>
                  <button className="text-sm text-blue-600">
                    Balance: 
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
                    TKB
                  </div>
                </div>
              </div>
            </div>

            {/* Price Info */}
            

            {/* Action Button - Add Liquidity with Dual Approval */}

            {/* Success Message */}
          </>
        )}

      </div>

      {/* Info Section */}
      <InfoSection />
    </div>
  )
}

function InfoSection(){
  return(
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">How it works</h3>
      <ul className="text-sm text-gray-600 space-y-1">
        <li>• Add liquidity in a 1:1 ratio to earn trading fees</li>
        <li>• Receive LP tokens representing your pool share</li>
        <li>• Remove liquidity anytime by burning LP tokens</li>
        <li>• Earn 0.3% fee on all swaps proportional to your share</li>
      </ul>
    </div>
  )
}
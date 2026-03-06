"use client"

import { useEffect, useState } from 'react'

export default function DuneChart({ queryId, maxRows = 100 }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [parsedId, setParsedId] = useState(null)
  const [page, setPage] = useState(1)
  const pageSize = 26

  // Accept either a numeric id or a full Dune URL and extract the last numeric segment
  function extractId(input){
    if (!input && input !== 0) return null
    const s = String(input).trim()
    // find all number groups and use the last one (works for /queries/12345 or /queries/4319/22558)
    const m = s.match(/\d+/g)
    if (m && m.length > 0) return m[m.length - 1]
    // if the whole string is numeric, return it
    if (/^\d+$/.test(s)) return s
    return null
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    setData(null)
    fetch(`/api/dune/query?page=${page}&pageSize=${pageSize}`)
      .then(res => res.json())
      .then(d => {
        if (!mounted) return
        setData(d)
      })
      .catch(err => {
        if (!mounted) return
        setError(String(err))
      })
      .finally(() => mounted && setLoading(false))

    return () => { mounted = false }
  }, [page])


  if (loading) return (
    <div className="bg-card p-6 rounded-md h-[500px] flex flex-col items-center justify-center overflow-auto border border-border dark:border-0">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mb-3" />
      <div className="text-sm text-gray-600">Loading Dune data...</div>
    </div>
  )

  if (error) return (
    <div className="bg-card p-4 rounded-md h-[500px] flex items-center justify-center overflow-auto border border-border dark:border-0">
      <div className="text-sm text-red-600">{error}</div>
    </div>
  )

  if (!data) return (
    <div className="bg-card p-4 rounded-md h-[500px] flex items-center justify-center overflow-auto border border-border dark:border-0">
      <div className="text-sm text-gray-600">No data returned.</div>
    </div>
  )

  // Dune response shapes vary. Try to find rows in common fields.
  const rows = data?.result?.rows || data?.result?.data || data?.rows || data?.data || data?.result || []

  // If rows is an array of objects, render a simple table
  if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'object'){
    const keys = Object.keys(rows[0]).reverse() // reverse to show in more natural order (id at end, not start)
    const total = data?.total || 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const pagedRows = rows // server already returned paged rows

    function goPrev(){ setPage(p => Math.max(1, p - 1)) }
    function goNext(){ setPage(p => Math.min(totalPages, p + 1)) }
    function goTo(n){ setPage(() => Math.min(Math.max(1, n), totalPages)) }

    const showingFrom = (currentPage - 1) * pageSize + 1
    const showingTo = (currentPage - 1) * pageSize + pagedRows.length

    return (
      <div className="bg-card p-4 rounded-md h-[500px] flex flex-col border border-border dark:border-0">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">Ranked 🥇 DEX by volume</div>
          <div className="text-xs text-gray-500">Showing {showingFrom}-{showingTo} of {total}</div>
        </div>
        <div className="overflow-auto flex-1 dune-scroll overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {keys.map(k => (
                    <th
                      key={k}
                      className="text-center pr-4 py-2 font-semibold text-gray-700 dark:text-gray-200 sticky top-0 z-10 bg-gray-50 dark:bg-gray-800"
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                    {keys.map(k => {
                      const raw = r[k]
                      const s = raw == null ? '' : String(raw)
                      if (String(k).toLowerCase().includes('rank')) {
                        return <td key={k} className="pr-4 py-2 align-top text-sm text-gray-700 dark:text-gray-200 text-center">{s}</td>
                      }
                      const cleaned = s.replace(/[^0-9.\-]/g, '')
                      const num = cleaned === '' ? NaN : Number(cleaned)
                      const cell = !isNaN(num) ? `$${Math.trunc(num).toLocaleString()}` : s
                      return <td key={k} className="pr-4 py-2 align-top text-sm text-gray-700 dark:text-gray-200 text-center">{cell}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {/* Pagination controls - bottom right */}
        { totalPages > 1 && (
          <div className="mt-3 flex justify-end items-center gap-2">
            <button onClick={goPrev} disabled={currentPage === 1} className="px-0 py-1 rounded text-sm bg-transparent disabled:opacity-50">&lt;</button>
            <div className="flex items-center gap-1 bg-transparent px-1 py-1 rounded text-sm">
              {Array.from({length: totalPages}).map((_, idx) => {
                const n = idx + 1
                const show = n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1
                if (!show) {
                  // render ellipsis placeholder when appropriate
                  if (n === 2 && currentPage > 3) return <span key={n} className="px-0.5">...</span>
                  if (n === totalPages - 1 && currentPage < totalPages - 2) return <span key={n} className="px-1">...</span>
                  return null
                }
                return (
                  <button key={n} onClick={() => goTo(n)} className={`w-6 h-6 flex items-center justify-center rounded-2xl ${n === currentPage ? 'bg-blue-400 text-white' : ''}`}>{n}</button>
                )
              })}
            </div>
            <button onClick={goNext} disabled={currentPage === totalPages} className="px-0 py-1 rounded text-sm bg-transparent disabled:opacity-50">&gt;</button>
          </div>
        )}
      </div>
    )
  }

  // Fallback: show JSON
  return <pre className="text-xs p-2 bg-card rounded overflow-auto border border-border dark:border-0">{JSON.stringify(data, null, 2)}</pre>
}

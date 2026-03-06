"use client"

import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'

export default function DuneBar({ height = 500 }){
  const ref = useRef(null)
  const chartRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pieDataState, setPieDataState] = useState([])

  // fixed palette so legend colors stable
  const palette = ['#56569B','#FF88FC','#909090','#CC61B0','#ef4444','#a78bfa','#fb7185','#60a5fa','#94a3b8']

  useEffect(() => {
    let mounted = true
    let onResize = null
    let retryId = null
    setLoading(true)
    setError(null)

    async function load(){
      try{
        const res = await fetch('/api/dune/query')
        const d = await res.json()
        if (!mounted) return
        const rows = d?.result?.rows || d?.result?.data || d?.rows || d?.data || d?.result || []
        if (!Array.isArray(rows) || rows.length === 0) {
          setError('No rows for chart')
          setLoading(false)
          return
        }

        const keys = Object.keys(rows[0])
        const projectKey = keys.find(k => /project|name|token|pair/i.test(k)) || keys.find(k => typeof rows[0][k] === 'string') || keys[0]
        const volKey = keys.find(k => /7\s*days|7d|7_day|7days|7\s*day|7-Days|seven/i.test(k)) || keys.find(k => /7/.test(k) && /vol|volume|amt|amount/i.test(k)) || keys.find(k => /vol|volume|amount|value/i.test(k))

        const dataPoints = []
        for (const r of rows){
          const name = String(r[projectKey] ?? '').trim() || 'Unknown'
          const s = r[volKey] == null ? '' : String(r[volKey])
          const cleaned = s.replace(/[^0-9.\-]/g, '')
          const num = cleaned === '' ? 0 : Number(cleaned)
          if (!isNaN(num) && num > 0) dataPoints.push({ name, value: num })
        }

        if (dataPoints.length === 0){
          setError('No numeric volume data')
          setLoading(false)
          return
        }

        dataPoints.sort((a,b) => b.value - a.value)
        // use ALL data points (no top-N aggregation)
        const pieData = dataPoints.map((x,i) => ({ name: x.name, value: Math.trunc(x.value), itemStyle: { opacity: 1, color: palette[i % palette.length] } }))
        setPieDataState(pieData)

        const option = {
          color: palette,
          title: { text: '', left: 'center', top: 8, textStyle: { fontSize: 14 } },
          tooltip: { trigger: 'item', formatter: function(params){ const v = params.value || 0; return `${params.name}: <b>$${Number(v).toLocaleString()}</b> (${Math.round(params.percent)}%)` } },
          legend: { show: false },
          series: [
            {
              name: '7 Days Volume',
              type: 'pie',
              radius: ['50%','85%'],
              avoidLabelOverlap: false,
              hoverOffset: 0,
              itemStyle: { borderRadius: 0, borderColor: 'transparent', borderWidth: 1 },
              label: { show: true, position: 'inside', color: '#fff', fontWeight: 600, formatter: function(params){ return (params && params.percent) >= 30 ? `${Math.round(params.percent)}%` : '' } },
              emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.2)' }, label: { show: true, fontSize: 12, fontWeight: 700 } },
              labelLine: { show: false },
              data: pieData
            }
          ]
        }

        // init chart when container ready; mark loaded immediately so UI shows legend
        setLoading(false)

        const doInit = () => {
          const el = ref.current
          if (!el) return false
          if (chartRef.current) chartRef.current.dispose()
          const chart = echarts.init(el)
          chartRef.current = chart
          chart.setOption(option)

          onResize = () => chart.resize()
          window.addEventListener('resize', onResize)

          // hover handlers: dim other slices by lowering opacity
          chart.on('mouseover', function(params){
            if (params && params.componentType === 'series'){
              const idx = params.dataIndex
              const newData = pieData.map((d,i) => ({ ...d, itemStyle: { ...(d.itemStyle||{}), opacity: i === idx ? 1 : 0.35 } }))
              chart.setOption({ series: [{ data: newData }] })
            }
          })
          chart.on('mouseout', function(){
            chart.setOption({ series: [{ data: pieData }] })
          })
          return true
        }

        if (!doInit()){
          let attempts = 0
          retryId = setInterval(() => {
            attempts += 1
            if (doInit() || attempts > 20) {
              if (retryId) clearInterval(retryId)
              retryId = null
            }
          }, 150)
        }
      } catch (err){
        if (mounted) setError(String(err))
        setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
      if (onResize) window.removeEventListener('resize', onResize)
      if (chartRef.current) chartRef.current.dispose()
      try { if (typeof retryId !== 'undefined' && retryId) clearInterval(retryId) } catch(e){}
    }
  }, [])

  return (
    <div className="bg-card p-4 rounded-md border border-border dark:border-0 h-[500px] flex flex-col">
      {loading && <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-4 border-gray-300 border-t-transparent rounded-full animate-spin"/></div>}
      {error && <div className="flex-1 flex items-center justify-center text-sm text-red-600">{error}</div>}
      {!loading && !error && (
        <>
        <div className="text-sm text-muted-foreground">Market share 🍰DEX by volume 🏦</div>
        <div className="flex-1 md:flex gap-4">
          <div className="flex-1 min-w-0" style={{minHeight: height}}>
            <div ref={ref} style={{height: height, width: '100%'}} />
          </div>
          <div className="hidden md:block min-w-[80px] max-w-[220px] dune-scroll overflow-y-auto" style={{maxHeight: height-50}}>
            {pieDataState.map((d,i) => (
              <div key={d.name} className="flex items-center text-sm py-1">
                <div className="flex-1 text-right truncate pr-0 text-gray-400">{d.name}</div>
                <div className="w-3 h-3 rounded-xs ml-2" style={{background: palette[i % palette.length]}} />
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  )
}

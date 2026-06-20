"use client"
import { useMemo, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useStrategyStore } from '@/store/useStrategyStore'
import { generateIVSurface } from '@/lib/mockData'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ScatterChart, Scatter,
  ZAxis, Cell
} from 'recharts'
import { Activity, TrendingUp, BarChart3, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-2.5 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          {p.name?.includes('IV') || p.name === 'iv' ? '%' : ''}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { spotPrice, marketData, selectedSymbol } = useStrategyStore()
  const mkt = marketData.find(m => m.symbol === selectedSymbol)
  const iv  = mkt?.iv ?? 15
  const [activeSection, setActiveSection] = useState<'skew'|'term'|'surface'>('skew')

  // Skew data
  const skewData = useMemo(() => {
    const tick = mkt?.tickSize ?? 50
    const atm  = Math.round(spotPrice / tick) * tick
    return Array.from({ length: 21 }, (_, i) => {
      const K = atm + (i - 10) * tick
      const moneyness = ((K - spotPrice) / spotPrice * 100)
      const skewedIV = iv * (1 - 0.08 * (moneyness/100) + 0.04 * (moneyness/100)**2)
      return { moneyness: moneyness.toFixed(1), strike: K, iv: Math.max(skewedIV, iv * 0.6) }
    })
  }, [spotPrice, iv, mkt])

  // Term structure
  const termData = useMemo(() => {
    const dtes = [7,14,21,30,45,60,90,120,180]
    return dtes.map(dte => ({
      dte: `${dte}d`,
      iv: iv + 2 * Math.exp(-dte / 60) + (Math.random() - 0.5) * 0.5,
      hvol: iv * 0.82 + (Math.random() - 0.5) * 0.3,
    }))
  }, [iv])

  // IV surface (scatter)
  const surfaceData = useMemo(() => {
    const surface = generateIVSurface(spotPrice)
    return surface.map(p => ({
      x: p.strike, y: p.dte, z: p.iv,
      color: p.iv > 22 ? '#ef4444' : p.iv > 18 ? '#f59e0b' : p.iv > 14 ? '#22c55e' : '#818cf8'
    }))
  }, [spotPrice])

  const statCards = [
    { label: 'Current IV',    value: `${iv.toFixed(1)}%`,           sub: '30-day implied',      color: 'text-blue-400'   },
    { label: 'IV Rank',       value: `${mkt?.ivRank ?? 50}`,        sub: '52-week percentile',  color: mkt && mkt.ivRank > 60 ? 'text-red-400' : mkt && mkt.ivRank < 30 ? 'text-green-400' : 'text-yellow-400' },
    { label: 'HV 30',         value: `${(iv * 0.82).toFixed(1)}%`,  sub: '30-day realised',     color: 'text-gray-300'   },
    { label: 'IV Premium',    value: `${(iv - iv * 0.82).toFixed(1)}%`, sub: 'IV − HV',         color: iv > iv * 0.82 ? 'text-red-400' : 'text-green-400' },
  ]

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5">

          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-400" /> IV Analytics — {selectedSymbol}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Implied volatility skew, term structure, and surface</p>
            </div>
            <div className="flex gap-1 bg-[#1a1f2e] rounded-lg p-1 border border-[#1e2535]">
              {([['skew','IV Skew'],['term','Term Structure'],['surface','IV Surface']] as const).map(([id,label]) => (
                <button key={id} onClick={() => setActiveSection(id)}
                  className={cn('px-3 py-1.5 rounded text-xs font-medium transition-all',
                    activeSection===id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {statCards.map(s => (
              <div key={s.label} className="bg-[#0f1420] rounded-xl border border-[#1e2535] p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className={cn("text-2xl font-mono font-bold mt-1.5 tabular", s.color)}>{s.value}</p>
                <p className="text-[10px] text-gray-600 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          {activeSection === 'skew' && (
            <div className="bg-[#0f1420] rounded-xl border border-[#1e2535] p-5">
              <h2 className="text-sm font-semibold text-white mb-1">Volatility Skew</h2>
              <p className="text-xs text-gray-600 mb-4">IV across strikes — put skew visible at negative moneyness</p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={skewData} margin={{top:5,right:20,left:10,bottom:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" vertical={false}/>
                  <XAxis dataKey="moneyness" tick={{fill:'#4b5563',fontSize:10}}
                    label={{value:'Moneyness (%)',position:'bottom',fill:'#4b5563',fontSize:11}}
                    axisLine={{stroke:'#1e2535'}} tickLine={false}/>
                  <YAxis tick={{fill:'#4b5563',fontSize:10}} tickFormatter={v=>`${v.toFixed(0)}%`}
                    axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>}/>
                  <ReferenceLine x="0.0" stroke="#374151" strokeDasharray="4 3"/>
                  <Line type="monotone" dataKey="iv" name="IV" stroke="#818cf8" strokeWidth={2.5} dot={false} activeDot={{r:4,fill:'#818cf8'}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeSection === 'term' && (
            <div className="bg-[#0f1420] rounded-xl border border-[#1e2535] p-5">
              <h2 className="text-sm font-semibold text-white mb-1">Term Structure</h2>
              <p className="text-xs text-gray-600 mb-4">IV vs HV across expiries — contango / backwardation</p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={termData} margin={{top:5,right:20,left:10,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" vertical={false}/>
                  <XAxis dataKey="dte" tick={{fill:'#4b5563',fontSize:10}} axisLine={{stroke:'#1e2535'}} tickLine={false}/>
                  <YAxis tick={{fill:'#4b5563',fontSize:10}} tickFormatter={v=>`${v.toFixed(0)}%`} axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>}/>
                  <Line type="monotone" dataKey="iv"   name="Implied IV" stroke="#818cf8" strokeWidth={2.5} dot={{fill:'#818cf8',r:3}} activeDot={{r:5}}/>
                  <Line type="monotone" dataKey="hvol" name="Hist. Vol"  stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={false}/>
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-4 h-0.5 bg-[#818cf8] inline-block rounded"/> Implied IV
                </span>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-4 h-0.5 bg-yellow-500 inline-block rounded" style={{borderStyle:'dashed'}}/> Historical Vol
                </span>
              </div>
            </div>
          )}

          {activeSection === 'surface' && (
            <div className="bg-[#0f1420] rounded-xl border border-[#1e2535] p-5">
              <h2 className="text-sm font-semibold text-white mb-1">IV Surface</h2>
              <p className="text-xs text-gray-600 mb-3">Implied volatility across strikes (x) and expiries (y) — bubble size = IV magnitude</p>
              <div className="flex gap-4 mb-3 text-[10px]">
                {[['#818cf8','< 14%'],['#22c55e','14–18%'],['#f59e0b','18–22%'],['#ef4444','> 22%']].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{background:c}}/>{l}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{top:10,right:30,left:10,bottom:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2030"/>
                  <XAxis dataKey="x" type="number" name="Strike" tick={{fill:'#4b5563',fontSize:10}}
                    tickFormatter={v => v>=10000?(v/1000).toFixed(0)+'k':String(v)}
                    label={{value:'Strike',position:'bottom',fill:'#4b5563',fontSize:11}}
                    axisLine={{stroke:'#1e2535'}} tickLine={false} domain={['auto','auto']}/>
                  <YAxis dataKey="y" type="number" name="DTE" tick={{fill:'#4b5563',fontSize:10}}
                    label={{value:'DTE',angle:-90,position:'insideLeft',fill:'#4b5563',fontSize:11}}
                    axisLine={false} tickLine={false}/>
                  <ZAxis dataKey="z" range={[30,220]}/>
                  <Tooltip cursor={false} content={({active,payload})=>{
                    if(!active||!payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-2.5 text-xs shadow-xl">
                        <p className="text-gray-400">Strike: <span className="font-mono text-white">{d.x?.toLocaleString('en-IN')}</span></p>
                        <p className="text-gray-400">DTE: <span className="font-mono text-white">{d.y}d</span></p>
                        <p className="text-gray-400">IV: <span className="font-mono text-blue-400">{d.z?.toFixed(1)}%</span></p>
                      </div>
                    )
                  }}/>
                  <Scatter data={surfaceData} shape={(props: any) => {
                    const {cx,cy,payload} = props
                    return <circle cx={cx} cy={cy} r={Math.sqrt(props.width||30)/1.5} fill={payload.color} fillOpacity={0.8}/>
                  }}/>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All symbols IV table */}
          <div className="bg-[#0f1420] rounded-xl border border-[#1e2535] overflow-hidden mt-5">
            <div className="px-4 py-3 border-b border-[#1e2535]">
              <h2 className="text-sm font-semibold text-white">IV Snapshot — All Instruments</h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e2535] bg-[#1a1f2e]">
                  {['Symbol','Spot','IV%','HV%','IV Rank','IV Premium','Category'].map(h=>(
                    <th key={h} className="text-left px-4 py-2 text-gray-500 font-medium text-[10px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marketData.map(m=>(
                  <tr key={m.symbol} className="border-b border-[#1e2535]/40 hover:bg-[#1a1f2e]/50 transition-colors">
                    <td className="px-4 py-2 font-semibold text-white">{m.symbol}</td>
                    <td className="px-4 py-2 font-mono tabular text-gray-300">{m.spot.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 font-mono tabular text-blue-400">{m.iv.toFixed(1)}%</td>
                    <td className="px-4 py-2 font-mono tabular text-gray-400">{(m.iv*0.82).toFixed(1)}%</td>
                    <td className={cn("px-4 py-2 font-mono tabular font-semibold",
                      m.ivRank>65?'text-red-400':m.ivRank<35?'text-green-400':'text-yellow-400')}>
                      {m.ivRank}
                    </td>
                    <td className={cn("px-4 py-2 font-mono tabular",
                      m.iv > m.iv*0.82 ? 'text-red-400' : 'text-green-400')}>
                      +{(m.iv - m.iv*0.82).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] border",
                        m.category==='index'
                          ? 'bg-blue-400/10 border-blue-400/30 text-blue-400'
                          : 'bg-purple-400/10 border-purple-400/30 text-purple-400')}>
                        {m.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}

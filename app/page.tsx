"use client"
import { useMemo, useState, useEffect } from 'react'
import { useStrategyStore } from '@/store/useStrategyStore'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { generatePriceHistory } from '@/lib/mockData'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Activity, Zap, BarChart3, BarChart2, Star } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PRESET_STRATEGIES } from '@/lib/types'

export default function DashboardPage() {
  const { marketData, selectedSymbol, spotPrice, setSelectedSymbol, watchlist, addToWatchlist, removeFromWatchlist } = useStrategyStore()
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'indices'|'stocks'>('indices')
  useEffect(() => setMounted(true), [])

  const history = useMemo(() => generatePriceHistory(spotPrice), [spotPrice])
  const mkt     = marketData.find(m => m.symbol === selectedSymbol)
  const indices  = marketData.filter(m => m.category === 'index')
  const stocks   = marketData.filter(m => m.category === 'stock')
  const topMovers = useMemo(() => [...marketData].sort((a,b) => Math.abs(b.changePct)-Math.abs(a.changePct)).slice(0,5), [marketData])
  const highIV    = useMemo(() => [...marketData].sort((a,b) => b.ivRank-a.ivRank).slice(0,5), [marketData])

  const stat = (label:string, value:string, sub:string, color:string, Icon:any) => (
    <div key={label} className="rounded-xl border border-[#1e2535] p-4" style={{background:'#0f1420'}}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={cn("text-2xl font-mono font-bold mt-1.5 tabular",color)} suppressHydrationWarning>{value}</p>
          <p className="text-[10px] text-gray-600 mt-1" suppressHydrationWarning>{sub}</p>
        </div>
        <Icon className={cn("h-5 w-5 mt-0.5",color)}/>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#0d1117'}}>
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header/>
        <main className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {stat('Spot Price',`₹${spotPrice.toLocaleString('en-IN')}`,selectedSymbol,'text-green-400',TrendingUp)}
            {stat('Futures',mounted?`₹${(mkt?.futures??spotPrice).toLocaleString('en-IN',{maximumFractionDigits:0})}`:'—',mounted?`Basis: ${((mkt?.futures??spotPrice)-spotPrice).toFixed(2)}`:'','text-blue-400',BarChart2)}
            {stat('Implied Vol',`${mkt?.iv?.toFixed(1)}%`,`IV Rank: ${mkt?.ivRank}`,mkt&&mkt.ivRank>65?'text-red-400':mkt&&mkt.ivRank<35?'text-green-400':'text-purple-400',Activity)}
            {stat('Change',mounted?`${(mkt?.changePct||0)>=0?'+':''}${mkt?.changePct?.toFixed(2)}%`:'—',mounted?`₹${mkt?.change?.toFixed(2)}`:'—',(mkt?.changePct||0)>=0?'text-green-400':'text-red-400',(mkt?.changePct||0)>=0?TrendingUp:TrendingDown)}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Chart */}
            <div className="col-span-2 rounded-xl border border-[#1e2535] p-4" style={{background:'#0f1420'}}>
              <p className="text-sm font-semibold text-white mb-3">{selectedSymbol} — 90 Day Price</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={history} margin={{top:5,right:10,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" vertical={false}/>
                  <XAxis dataKey="date" tick={{fill:'#4b5563',fontSize:10}} tickFormatter={v=>v.slice(5)} interval={12} axisLine={{stroke:'#1e2535'}} tickLine={false}/>
                  <YAxis tick={{fill:'#4b5563',fontSize:10}} tickFormatter={v=>(v/1000).toFixed(1)+'k'} domain={['auto','auto']} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'#1a1f2e',border:'1px solid #2a3040',borderRadius:'8px',fontSize:'12px'}} formatter={(v:any)=>[`₹${Number(v).toLocaleString('en-IN')}`,'Close']} labelStyle={{color:'#9ca3af'}}/>
                  <Area type="monotone" dataKey="close" stroke="#22c55e" fill="url(#pg)" strokeWidth={2} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Right col */}
            <div className="space-y-3">
              <div className="rounded-xl border border-[#1e2535] p-3" style={{background:'#0f1420'}}>
                <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-blue-400"/>Strategy Templates</p>
                {PRESET_STRATEGIES.slice(0,6).map(s => (
                  <Link key={s.name} href="/builder" className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1a1f2e] cursor-pointer group block">
                    <p className="text-xs font-medium text-gray-400 group-hover:text-white">{s.name}</p>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] border shrink-0",
                      s.tags[0]==='bullish'?'bg-green-400/10 border-green-400/30 text-green-400':s.tags[0]==='bearish'?'bg-red-400/10 border-red-400/30 text-red-400':'bg-yellow-400/10 border-yellow-400/30 text-yellow-400')}>
                      {s.tags[0]}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="rounded-xl border border-[#1e2535] p-3" style={{background:'#0f1420'}}>
                <p className="text-xs font-semibold text-white mb-2">Top Movers</p>
                {topMovers.map(m => (
                  <button key={m.symbol} onClick={() => setSelectedSymbol(m.symbol)} className="flex items-center justify-between w-full hover:bg-[#1a1f2e] rounded px-1.5 py-1 cursor-pointer">
                    <span className="text-xs font-medium text-gray-300">{m.symbol}</span>
                    <span className={cn("text-xs font-mono tabular font-semibold",m.changePct>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>
                      {mounted?`${m.changePct>=0?'+':''}${m.changePct.toFixed(2)}%`:''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Indices/Stocks */}
          <div className="rounded-xl border border-[#1e2535] overflow-hidden" style={{background:'#0f1420'}}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2535]">
              <div className="flex gap-1 bg-[#1a1f2e] rounded-lg p-1">
                {(['indices','stocks'] as const).map(t=>(
                  <button key={t} onClick={()=>setTab(t)} className={cn("px-3 py-1 rounded text-xs font-medium capitalize cursor-pointer transition-all",tab===t?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-300')}>
                    {t==='indices'?`Indices (${indices.length})`:`F&O Stocks (${stocks.length})`}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600">★ to watchlist</p>
            </div>
            {tab==='indices' && (
              <div className="grid grid-cols-5 gap-3 p-4">
                {indices.map(m => (
                  <div key={m.symbol} onClick={()=>setSelectedSymbol(m.symbol)}
                    className={cn("rounded-lg border p-3 cursor-pointer transition-all hover:border-blue-500/30 group",selectedSymbol===m.symbol?'border-blue-500/50 bg-blue-600/5':'border-[#2a3040] bg-[#1a1f2e]')}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-blue-400">{m.symbol}</p>
                      <button onClick={e=>{e.stopPropagation();watchlist.includes(m.symbol)?removeFromWatchlist(m.symbol):addToWatchlist(m.symbol)}}
                        className={cn("opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity",watchlist.includes(m.symbol)?'text-yellow-400':'text-gray-600 hover:text-yellow-400')}>
                        <Star className={cn("h-3 w-3",watchlist.includes(m.symbol)&&"fill-current")}/>
                      </button>
                    </div>
                    <p className="font-mono font-bold text-white text-sm">{m.spot.toLocaleString('en-IN')}</p>
                    <p className={cn("text-xs font-mono mt-0.5 tabular",m.changePct>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>{mounted?`${m.changePct>=0?'+':''}${m.changePct.toFixed(2)}%`:''}</p>
                    <p className="text-[10px] text-gray-600 mt-1">IV {m.iv.toFixed(1)}% · Rank <span className={cn(m.ivRank>65?'text-red-400':m.ivRank<35?'text-green-400':'text-yellow-400')}>{m.ivRank}</span></p>
                    <p className="text-[10px] text-blue-400/60 mt-0.5" suppressHydrationWarning>{mounted?`FUT ₹${(m.futures??m.spot).toLocaleString('en-IN',{maximumFractionDigits:0})}`:''}</p>
                  </div>
                ))}
              </div>
            )}
            {tab==='stocks' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1e2535] bg-[#1a1f2e]">
                      {['','Symbol','Sector','Spot','Futures','Chg%','IV%','IV Rank','Lot'].map(h=>(
                        <th key={h} className="text-left px-3 py-2.5 text-gray-500 font-medium text-[10px] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map(m=>(
                      <tr key={m.symbol} onClick={()=>setSelectedSymbol(m.symbol)}
                        className={cn("border-b border-[#1e2535]/40 hover:bg-[#1a1f2e]/60 cursor-pointer",selectedSymbol===m.symbol&&"bg-blue-600/5")}>
                        <td className="px-3 py-2 w-8">
                          <button onClick={e=>{e.stopPropagation();watchlist.includes(m.symbol)?removeFromWatchlist(m.symbol):addToWatchlist(m.symbol)}}
                            className={cn("cursor-pointer",watchlist.includes(m.symbol)?'text-yellow-400':'text-gray-700 hover:text-yellow-400')}>
                            <Star className={cn("h-3 w-3",watchlist.includes(m.symbol)&&"fill-current")}/>
                          </button>
                        </td>
                        <td className="px-3 py-2 font-bold text-purple-400">{m.symbol}</td>
                        <td className="px-3 py-2 text-gray-500">{m.sector}</td>
                        <td className="px-3 py-2 font-mono tabular text-gray-200">{m.spot.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 font-mono tabular text-blue-400" suppressHydrationWarning>{mounted?(m.futures??m.spot).toLocaleString('en-IN',{maximumFractionDigits:0}):''}</td>
                        <td className={cn("px-3 py-2 font-mono tabular font-semibold",m.changePct>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>{mounted?`${m.changePct>=0?'+':''}${m.changePct.toFixed(2)}%`:''}</td>
                        <td className="px-3 py-2 font-mono tabular text-blue-300">{m.iv.toFixed(1)}%</td>
                        <td className={cn("px-3 py-2 font-mono tabular font-semibold",m.ivRank>65?'text-red-400':m.ivRank<35?'text-green-400':'text-yellow-400')}>{m.ivRank}</td>
                        <td className="px-3 py-2 font-mono tabular text-gray-500">{m.lotSize}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* High IV */}
          <div className="rounded-xl border border-[#1e2535] p-4" style={{background:'#0f1420'}}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="h-4 w-4 text-red-400"/>High IV Rank — Premium Selling Opportunities</p>
              <Link href="/scanner" className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">View Scanner →</Link>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {highIV.map(m=>(
                <Link key={m.symbol} href="/builder" onClick={()=>setSelectedSymbol(m.symbol)}
                  className="rounded-lg border border-[#2a3040] bg-[#1a1f2e] p-3 hover:border-red-500/30 hover:bg-[#1e2535] cursor-pointer group block transition-all">
                  <p className="text-xs font-bold text-white">{m.symbol}</p>
                  <p className={cn("text-lg font-mono font-bold mt-1 tabular",m.ivRank>75?'text-red-400':m.ivRank>55?'text-orange-400':'text-yellow-400')}>{m.ivRank}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">IV Rank</p>
                  <p className="text-[10px] text-blue-300 mt-1">IV {m.iv.toFixed(1)}%</p>
                  <p className="text-[10px] text-gray-600 group-hover:text-blue-400 mt-1 transition-colors">→ Build strategy</p>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

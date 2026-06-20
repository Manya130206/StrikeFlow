"use client"
import { useState, useEffect, useRef } from 'react'
import { useStrategyStore } from '@/store/useStrategyStore'
import { Bell, Search, Star } from 'lucide-react'
import MarketTicker from '@/components/market/MarketTicker'
import PriceEditor from '@/components/market/PriceEditor'
import { cn } from '@/lib/utils'

export default function Header() {
  const { spotPrice, selectedSymbol, setSpotPrice, setSelectedSymbol, marketData,
          watchlist, addToWatchlist, removeFromWatchlist, alerts, addAlert, removeAlert, toggleAlert, addToast } = useStrategyStore()
  const mkt = marketData.find(m => m.symbol === selectedSymbol)
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [alertThresh, setAlertThresh] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)
  const alertRef  = useRef<HTMLDivElement>(null)
  useEffect(() => setMounted(true), [])

  const now = new Date()
  const isWatched = watchlist.includes(selectedSymbol)
  const filtered = search ? marketData.filter(m => m.symbol.toLowerCase().includes(search.toLowerCase()) || (m.sector?.toLowerCase().includes(search.toLowerCase()))) : []

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false)
      if (alertRef.current  && !alertRef.current.contains(e.target as Node))  setShowAlerts(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <header className="border-b border-[#1e2535] px-5 py-2.5 flex-shrink-0" style={{background:'#0a0e17'}}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest">{selectedSymbol} Spot</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-gray-500 font-mono">₹</span>
              <input type="number" value={spotPrice}
                onChange={e => { const v = Number(e.target.value); if (v > 0) setSpotPrice(v) }}
                className="w-24 bg-transparent font-mono font-bold text-base text-white border-none outline-none focus:text-blue-400 transition-colors tabular"/>
            </div>
          </div>
          {mounted && mkt?.futures && <>
            <div className="w-px h-8 bg-[#1e2535]"/>
            <div><p className="text-[9px] text-gray-600 uppercase tracking-widest">Futures</p>
              <p className="font-mono font-bold text-blue-400 mt-0.5 tabular text-sm" suppressHydrationWarning>₹{mkt.futures.toLocaleString('en-IN',{maximumFractionDigits:2})}</p></div>
            <div><p className="text-[9px] text-gray-600 uppercase tracking-widest">Basis</p>
              <p className={cn("font-mono font-bold mt-0.5 tabular text-sm",(mkt.futures-mkt.spot)>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>
                {(mkt.futures-mkt.spot)>=0?'+':''}{(mkt.futures-mkt.spot).toFixed(2)}</p></div>
          </>}
          {mounted && mkt && <>
            <div className="w-px h-8 bg-[#1e2535]"/>
            <div><p className="text-[9px] text-gray-600 uppercase tracking-widest">IV / Rank</p>
              <p className="font-mono font-bold text-purple-400 mt-0.5 tabular text-sm">{mkt.iv.toFixed(1)}% / {mkt.ivRank}</p></div>
          </>}
          <div className="w-px h-8 bg-[#1e2535]"/>
          <p className="text-[10px] text-gray-600" suppressHydrationWarning>
            {mounted ? `${now.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})} · ${now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PriceEditor />
          <button onClick={() => isWatched ? removeFromWatchlist(selectedSymbol) : addToWatchlist(selectedSymbol)}
            title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            className={cn("p-1.5 rounded-lg transition-colors cursor-pointer",
              isWatched ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20' : 'text-gray-500 hover:text-yellow-400 hover:bg-[#1a1f2e]')}>
            <Star className={cn("h-4 w-4", isWatched && "fill-current")}/>
          </button>

          {/* Search */}
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600"/>
              <input placeholder="Search symbols..." value={search}
                onChange={e => { setSearch(e.target.value); setShowSearch(true) }}
                onFocus={() => setShowSearch(true)}
                className="pl-8 pr-3 h-7 w-44 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/60"/>
            </div>
            {showSearch && filtered.length > 0 && (
              <div className="absolute top-full mt-1 left-0 bg-[#0f1420] border border-[#1e2535] rounded-lg shadow-2xl z-50 w-64 overflow-hidden">
                {filtered.map(m => (
                  <button key={m.symbol} onClick={() => { setSelectedSymbol(m.symbol); setSearch(''); setShowSearch(false) }}
                    className="flex items-center justify-between w-full px-3 py-2 hover:bg-[#1a1f2e] cursor-pointer text-left transition-colors">
                    <div>
                      <span className="text-xs font-semibold text-white">{m.symbol}</span>
                      {m.sector && <span className="ml-2 text-[10px] text-gray-600">{m.sector}</span>}
                    </div>
                    <span className={cn("text-xs font-mono", m.changePct>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>
                      {mounted ? `${m.changePct>=0?'+':''}${m.changePct.toFixed(2)}%` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alerts bell */}
          <div className="relative" ref={alertRef}>
            <button onClick={() => setShowAlerts(v => !v)} className="relative p-1.5 rounded-lg hover:bg-[#1a1f2e] cursor-pointer transition-colors">
              <Bell className="h-4 w-4 text-gray-500"/>
              {alerts.filter(a=>a.active).length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full"/>}
            </button>
            {showAlerts && (
              <div className="absolute top-full mt-1 right-0 bg-[#0f1420] border border-[#1e2535] rounded-xl shadow-2xl z-50 w-72 overflow-hidden">
                <div className="p-3 border-b border-[#1e2535]">
                  <p className="text-xs font-semibold text-white mb-2">Alerts — {selectedSymbol}</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder={`e.g. ${Math.round(spotPrice * 1.02)}`}
                      value={alertThresh} onChange={e => setAlertThresh(e.target.value)}
                      className="flex-1 bg-[#1e2535] border border-[#2a3040] rounded px-2 py-1 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500"/>
                    <button onClick={() => {
                      const t = Number(alertThresh)
                      if (!t) { addToast('Enter a threshold', 'error'); return }
                      addAlert(selectedSymbol, t > spotPrice ? 'price_above' : 'price_below', t)
                      setAlertThresh('')
                    }} className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-500 cursor-pointer transition-colors">Set</button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {alerts.length === 0
                    ? <p className="text-xs text-gray-600 text-center py-4">No alerts set</p>
                    : alerts.map(a => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 border-b border-[#1e2535]/50">
                        <div>
                          <p className="text-xs font-medium text-white">{a.symbol}</p>
                          <p className="text-[10px] text-gray-500">{a.condition.replace('_',' ')} ₹{a.threshold}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleAlert(a.id)}
                            className={cn("w-8 h-4 rounded-full relative cursor-pointer transition-colors flex-shrink-0", a.active ? 'bg-blue-600' : 'bg-[#2a3040]')}>
                            <div className={cn("w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all", a.active ? 'right-0.5' : 'left-0.5')}/>
                          </button>
                          <button onClick={() => removeAlert(a.id)} className="text-gray-600 hover:text-red-400 cursor-pointer text-xs">✕</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <MarketTicker />
    </header>
  )
}

"use client"
import { useState, useMemo } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useStrategyStore } from '@/store/useStrategyStore'
import { generateOptionChain } from '@/lib/mockData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { cn } from '@/lib/utils'
import { Plus, BarChart3 } from 'lucide-react'

export default function ChainPage() {
  const { spotPrice, marketData, selectedSymbol, addLeg } = useStrategyStore()
  const mkt      = marketData.find(m => m.symbol === selectedSymbol)
  const tickSize = mkt?.tickSize ?? 50
  const lotSize  = mkt?.lotSize  ?? 25
  const iv       = (mkt?.iv ?? 15) / 100
  const [dte, setDte]     = useState(30)
  const [hovered, setHovered] = useState<{strike:number;side:'call'|'put'}|null>(null)

  const chain = useMemo(
    () => generateOptionChain(spotPrice, dte, tickSize, iv),
    [spotPrice, dte, tickSize, iv]
  )

  const oiData = useMemo(
    () => chain.slice(2,-2).map(c => ({ strike: c.strike, callOI: c.callOI, putOI: c.putOI })),
    [chain]
  )

  const handleAdd = (strike: number, optionType: 'call'|'put', premium: number) => {
    addLeg({
      id: Date.now().toString(),
      symbol: selectedSymbol, strike,
      expiry: new Date(Date.now() + dte * 86400000).toISOString().split('T')[0],
      optionType, direction: 'long', lots: 1, premium, lotSize, instrumentType: 'option',
    })
  }

  const TT = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-2.5 text-xs shadow-xl">
        <p className="text-gray-400 mb-1 font-mono">{Number(label).toLocaleString('en-IN')}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{color:p.color}} className="font-mono">
            {p.name}: {(p.value/1000).toFixed(0)}K
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5">

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-400" /> Option Chain — {selectedSymbol}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Lot: {lotSize} · Tick: {tickSize} · Spot: ₹{spotPrice.toLocaleString('en-IN')} · FUT: ₹{(mkt?.futures??spotPrice).toLocaleString('en-IN',{maximumFractionDigits:0})}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Expiry:</span>
              {[7,14,21,30,45,60,90].map(d => (
                <button key={d} onClick={() => setDte(d)}
                  className={cn('px-2.5 py-1 rounded text-xs border transition-colors',
                    dte===d ? 'bg-blue-600/20 border-blue-500/60 text-blue-400' : 'border-[#1e2535] text-gray-500 hover:border-gray-500 hover:text-gray-300')}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* OI Chart */}
          <div className="bg-[#0f1420] rounded-xl border border-[#1e2535] p-4 mb-4">
            <h2 className="text-sm font-semibold text-white mb-0.5">Open Interest Distribution</h2>
            <p className="text-xs text-gray-600 mb-3">Green = Call OI · Red = Put OI · Yellow line = Spot</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={oiData} margin={{top:5,right:20,left:10,bottom:5}} barGap={1} barCategoryGap="15%">
                <XAxis dataKey="strike" tick={{fill:'#4b5563',fontSize:10}} tickFormatter={v=>v>=10000?(v/1000).toFixed(1)+'k':String(v)}
                  axisLine={{stroke:'#1e2535'}} tickLine={false}/>
                <YAxis tick={{fill:'#4b5563',fontSize:10}} tickFormatter={v=>(v/1000).toFixed(0)+'K'} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT/>}/>
                <ReferenceLine x={Math.round(spotPrice/tickSize)*tickSize} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}/>
                <Bar dataKey="callOI" name="Call OI" radius={[2,2,0,0]}>
                  {oiData.map((d,i)=><Cell key={i} fill={d.strike>=spotPrice?'#22c55e':'#16a34a'} fillOpacity={0.75}/>)}
                </Bar>
                <Bar dataKey="putOI" name="Put OI" radius={[2,2,0,0]}>
                  {oiData.map((d,i)=><Cell key={i} fill={d.strike<=spotPrice?'#ef4444':'#b91c1c'} fillOpacity={0.75}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chain table */}
          <div className="bg-[#0f1420] rounded-xl border border-[#1e2535] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e2535]">
                  <th colSpan={5} className="py-2 text-center text-green-400 font-semibold text-[10px] uppercase tracking-wide" style={{background:'rgba(34,197,94,0.05)'}}>CALLS</th>
                  <th className="py-2 text-center text-gray-300 font-bold px-4" style={{background:'#1a1f2e'}}>STRIKE</th>
                  <th colSpan={5} className="py-2 text-center text-red-400 font-semibold text-[10px] uppercase tracking-wide" style={{background:'rgba(239,68,68,0.05)'}}>PUTS</th>
                </tr>
                <tr className="border-b border-[#1e2535] text-gray-600 text-[10px]">
                  <th className="py-2 px-2 text-right">OI</th>
                  <th className="py-2 px-2 text-right">Vol</th>
                  <th className="py-2 px-2 text-right">IV%</th>
                  <th className="py-2 px-2 text-right">Bid</th>
                  <th className="py-2 px-2 text-right">Ask ↑</th>
                  <th className="py-2 px-3 text-center font-semibold text-gray-300" style={{background:'#1a1f2e'}}>Strike</th>
                  <th className="py-2 px-2 text-right">Bid ↑</th>
                  <th className="py-2 px-2 text-right">Ask</th>
                  <th className="py-2 px-2 text-right">IV%</th>
                  <th className="py-2 px-2 text-right">Vol</th>
                  <th className="py-2 px-2 text-right">OI</th>
                </tr>
              </thead>
              <tbody>
                {chain.map(row => (
                  <tr key={row.strike}
                    className={cn('border-b border-[#1e2535]/50 hover:bg-[#1a1f2e]/60 transition-colors',
                      row.isATM && 'bg-yellow-500/5')}>
                    {/* Call OI */}
                    <td className="py-1.5 px-2 text-right font-mono tabular text-gray-600">{(row.callOI/1000).toFixed(0)}K</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular text-gray-600">{(row.callVolume/1000).toFixed(0)}K</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular text-blue-400">{row.callIV.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular text-gray-400">{row.callBid.toFixed(2)}</td>
                    {/* Call Ask — clickable */}
                    <td className="py-1.5 px-2 text-right relative cursor-pointer"
                      onClick={() => handleAdd(row.strike,'call',row.callAsk)}
                      onMouseEnter={() => setHovered({strike:row.strike,side:'call'})}
                      onMouseLeave={() => setHovered(null)}>
                      <span className="font-mono tabular text-green-400 hover:text-green-300">{row.callAsk.toFixed(2)}</span>
                      {hovered?.strike===row.strike && hovered.side==='call' && (
                        <span className="absolute -top-0.5 right-0 bg-blue-600 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 z-10 whitespace-nowrap">
                          <Plus className="h-2.5 w-2.5"/>Buy
                        </span>
                      )}
                    </td>

                    {/* Strike */}
                    <td className={cn('py-1.5 px-3 text-center font-mono font-bold', row.isATM ? 'text-yellow-400' : 'text-gray-300')}
                      style={{background:'#1a1f2e'}}>
                      {row.strike.toLocaleString('en-IN')}
                      {row.isATM && <span className="ml-1 text-[9px] text-yellow-500 font-normal">ATM</span>}
                    </td>

                    {/* Put Bid — clickable */}
                    <td className="py-1.5 px-2 text-right relative cursor-pointer"
                      onClick={() => handleAdd(row.strike,'put',row.putBid)}
                      onMouseEnter={() => setHovered({strike:row.strike,side:'put'})}
                      onMouseLeave={() => setHovered(null)}>
                      <span className="font-mono tabular text-red-400 hover:text-red-300">{row.putBid.toFixed(2)}</span>
                      {hovered?.strike===row.strike && hovered.side==='put' && (
                        <span className="absolute -top-0.5 left-0 bg-blue-600 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 z-10 whitespace-nowrap">
                          <Plus className="h-2.5 w-2.5"/>Buy
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular text-gray-400">{row.putAsk.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular text-blue-400">{row.putIV.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular text-gray-600">{(row.putVolume/1000).toFixed(0)}K</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular text-gray-600">{(row.putOI/1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-[#1e2535] text-[10px] text-gray-700">
              Click Call Ask or Put Bid to add leg to Strategy Builder · Lot size {lotSize} · Tick {tickSize}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

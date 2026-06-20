"use client"
import { useState, useMemo, useCallback, useEffect } from 'react'
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Line } from 'recharts'
import { useStrategyStore } from '@/store/useStrategyStore'
import { blackScholes } from '@/lib/blackscholes'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Info, TrendingUp, Minus, RefreshCw, ChevronLeft, ChevronRight, Save, FileText, Copy, Download } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface Leg { id:string; enabled:boolean; bs:'B'|'S'; expiry:string; strike:number; type:'CE'|'PE'|'FUT'; lots:number; price:number }

// ── Expiry dates (next 5 Thursdays) ───────────────────────────────────────
function getExpiries(): string[] {
  const out: string[] = []; const now = new Date()
  for (let w = 0; w < 6; w++) {
    const d = new Date(now); const daysUntil = ((4 - d.getDay()) + 7) % 7 || 7
    d.setDate(d.getDate() + daysUntil + w * 7)
    const label = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
    if (!out.includes(label)) out.push(label)
  }
  return out.slice(0, 5)
}
const EXPIRIES = getExpiries()

// ── Payoff calc ────────────────────────────────────────────────────────────
function calcPayoff(legs: Leg[], spot: number, dte: number, lotSize: number) {
  if (!legs.filter(l=>l.enabled).length) return []
  const range = Math.max(spot * 0.12, 500), T = dte/365, r = 0.065
  return Array.from({length:101},(_,i) => {
    const S = (spot - range) + i * (2*range/100)
    let exp=0, tgt=0
    legs.filter(l=>l.enabled).forEach(l => {
      const m = l.bs==='B'?1:-1, sz = l.lots*lotSize
      if (l.type==='FUT') { exp+=(S-l.price)*m*sz; tgt+=exp; return }
      const intr = l.type==='CE' ? Math.max(S-l.strike,0) : Math.max(l.strike-S,0)
      exp += (intr - l.price)*m*sz
      if (T>0) { const g = blackScholes({S,K:l.strike,T:T*0.5,r,sigma:0.15,optionType:l.type==='CE'?'call':'put'}); tgt += (g.price-l.price)*m*sz }
      else tgt = exp
    })
    const oi = Math.round(80000 * Math.exp(-Math.abs(S-spot)/spot*40))
    return { x:Math.round(S), exp:Math.round(exp), tgt:Math.round(tgt), oi }
  })
}

// ── Tooltip ────────────────────────────────────────────────────────────────
const CTip = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-lg p-3 text-xs shadow-2xl min-w-[160px]">
      <p className="text-gray-400 mb-2 font-mono">{Number(label).toLocaleString('en-IN')}</p>
      {payload.find((p:any)=>p.dataKey==='exp') && <p className="flex justify-between gap-4"><span className="text-gray-400">At Expiry</span><span className={payload.find((p:any)=>p.dataKey==='exp').value>=0?'text-green-400 font-mono':'text-red-400 font-mono'}>{payload.find((p:any)=>p.dataKey==='exp').value>=0?'+':''}₹{Math.abs(payload.find((p:any)=>p.dataKey==='exp').value).toLocaleString()}</span></p>}
      {payload.find((p:any)=>p.dataKey==='tgt') && <p className="flex justify-between gap-4 mt-1"><span className="text-cyan-400">Target Date</span><span className={payload.find((p:any)=>p.dataKey==='tgt').value>=0?'text-green-400 font-mono':'text-red-400 font-mono'}>{payload.find((p:any)=>p.dataKey==='tgt').value>=0?'+':''}₹{Math.abs(payload.find((p:any)=>p.dataKey==='tgt').value).toLocaleString()}</span></p>}
    </div>
  )
}

// ── Leg row ────────────────────────────────────────────────────────────────
function LegRow({leg,tickSize,onChange,onRemove,onDuplicate}:{leg:Leg;tickSize:number;onChange:(id:string,f:keyof Leg,v:any)=>void;onRemove:(id:string)=>void;onDuplicate:(id:string)=>void}) {
  return (
    <div className={cn("flex items-center gap-1.5 py-1.5 px-2 border-b border-[#1e2535] group hover:bg-[#1a1f2e]/40",!leg.enabled&&"opacity-40")}>
      <input type="checkbox" checked={leg.enabled} onChange={e=>onChange(leg.id,'enabled',e.target.checked)} className="w-3.5 h-3.5 accent-blue-500 cursor-pointer flex-shrink-0"/>
      <button onClick={()=>onChange(leg.id,'bs',leg.bs==='B'?'S':'B')} className={cn("w-7 h-6 rounded text-xs font-bold flex-shrink-0 cursor-pointer transition-colors",leg.bs==='B'?'bg-blue-600 hover:bg-blue-500 text-white':'bg-red-600 hover:bg-red-500 text-white')}>{leg.bs}</button>
      <select value={leg.expiry} onChange={e=>onChange(leg.id,'expiry',e.target.value)} className="bg-[#1e2535] border border-[#2a3040] rounded px-1 py-0.5 text-xs text-gray-200 w-[68px] flex-shrink-0 cursor-pointer">
        {EXPIRIES.map(e=><option key={e} value={e}>{e}</option>)}
      </select>
      {leg.type!=='FUT'?(
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={()=>onChange(leg.id,'strike',leg.strike-tickSize)} className="w-5 h-6 rounded bg-[#1e2535] hover:bg-[#2a3040] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><Minus className="h-2.5 w-2.5"/></button>
          <input type="number" value={leg.strike} onChange={e=>onChange(leg.id,'strike',Number(e.target.value))} className="w-16 bg-[#1e2535] border border-[#2a3040] rounded px-1 py-0.5 text-xs text-center font-mono text-gray-200"/>
          <button onClick={()=>onChange(leg.id,'strike',leg.strike+tickSize)} className="w-5 h-6 rounded bg-[#1e2535] hover:bg-[#2a3040] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><Plus className="h-2.5 w-2.5"/></button>
        </div>
      ):(
        <div className="flex items-center gap-1 w-[88px] flex-shrink-0">
          <span className="text-[10px] text-purple-400 font-medium">FUT</span>
          <input type="number" value={leg.strike} onChange={e=>onChange(leg.id,'strike',Number(e.target.value))} className="w-16 bg-[#1e2535] border border-[#2a3040] rounded px-1 py-0.5 text-xs font-mono text-gray-200"/>
        </div>
      )}
      <div className="flex gap-0.5 flex-shrink-0">
        {(['CE','PE','FUT'] as const).map(t=>(
          <button key={t} onClick={()=>onChange(leg.id,'type',t)} className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors",leg.type===t?(t==='CE'?'bg-blue-600 text-white':t==='PE'?'bg-orange-600 text-white':'bg-purple-600 text-white'):'bg-[#1e2535] text-gray-500 hover:text-gray-300')}>{t}</button>
        ))}
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={()=>onChange(leg.id,'lots',Math.max(1,leg.lots-1))} className="w-5 h-6 rounded bg-[#1e2535] hover:bg-[#2a3040] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><Minus className="h-2.5 w-2.5"/></button>
        <input type="number" value={leg.lots} min={1} onChange={e=>onChange(leg.id,'lots',Math.max(1,Number(e.target.value)))} className="w-8 bg-[#1e2535] border border-[#2a3040] rounded text-xs text-center font-mono text-gray-200 py-0.5"/>
        <button onClick={()=>onChange(leg.id,'lots',leg.lots+1)} className="w-5 h-6 rounded bg-[#1e2535] hover:bg-[#2a3040] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><Plus className="h-2.5 w-2.5"/></button>
      </div>
      <input type="number" value={leg.price} min={0} step={0.05} onChange={e=>onChange(leg.id,'price',Math.max(0,Number(e.target.value)))} className="w-16 bg-[#1e2535] border border-[#2a3040] rounded px-1.5 py-0.5 text-xs font-mono text-gray-200 flex-shrink-0"/>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0">
        <button onClick={()=>onDuplicate(leg.id)} title="Duplicate" className="text-gray-500 hover:text-blue-400 cursor-pointer p-0.5"><Copy className="h-3 w-3"/></button>
        <button onClick={()=>onRemove(leg.id)} title="Remove" className="text-gray-500 hover:text-red-400 cursor-pointer p-0.5"><Trash2 className="h-3 w-3"/></button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SensibullBuilder() {
  const { selectedSymbol, spotPrice, marketData, savedStrategies, drafts, deleteStrategy, deleteDraft, addToast } = useStrategyStore()
  const mkt      = marketData.find(m=>m.symbol===selectedSymbol)
  const tickSize = mkt?.tickSize ?? 50
  const lotSize  = mkt?.lotSize  ?? 25
  const iv       = (mkt?.iv ?? 15)/100
  const atm      = Math.round(spotPrice/tickSize)*tickSize

  const [legs,        setLegs]        = useState<Leg[]>([])
  const [bottomTab,   setBottomTab]   = useState<'readymade'|'positions'|'saved'|'drafts'>('readymade')
  const [topTab,      setTopTab]      = useState<'payoff'|'pltable'|'greeks'>('payoff')
  const [subTab,      setSubTab]      = useState<'graph'|'table'>('graph')
  const [bias,        setBias]        = useState<'bullish'|'bearish'|'neutral'|'others'>('bullish')
  const [multiplier,  setMultiplier]  = useState(1)
  const [targetSpot,  setTargetSpot]  = useState(spotPrice)
  const [targetDte,   setTargetDte]   = useState(15)
  const [expiry,      setExpiry]      = useState(EXPIRIES[0])
  const [saveModal,   setSaveModal]   = useState(false)
  const [saveName,    setSaveName]    = useState('')
  const [mounted,     setMounted]     = useState(false)
  useEffect(()=>{ setMounted(true) }, [])
  useEffect(()=>{ setTargetSpot(spotPrice) }, [spotPrice])

  const enabled = legs.filter(l=>l.enabled)
  const net = useMemo(()=>enabled.reduce((s,l)=>s+(l.bs==='B'?-1:1)*l.price*l.lots*lotSize*multiplier,0),[enabled,lotSize,multiplier])

  const stratName = useMemo(()=>{
    if (!enabled.length) return 'New Strategy'
    const B=enabled.filter(l=>l.bs==='B').length, S=enabled.filter(l=>l.bs==='S').length
    const t=[...new Set(enabled.map(l=>l.type))]
    if(B===1&&S===1&&t.every(x=>x==='CE')) return 'Bull Call Spread'
    if(B===1&&S===1&&t.every(x=>x==='PE')) return 'Bear Put Spread'
    if(B===2&&S===2) return 'Iron Condor'
    if(B===2&&S===0&&enabled.some(l=>l.type==='CE')&&enabled.some(l=>l.type==='PE')) return 'Long Straddle'
    if(B===0&&S===2) return 'Short Straddle'
    if(enabled.every(l=>l.type==='FUT')) return B>0?'Long Futures':'Short Futures'
    return `${enabled.length} Leg Strategy`
  },[enabled])

  const chartData = useMemo(()=>calcPayoff(enabled, targetSpot||spotPrice, targetDte, lotSize*multiplier),[enabled,targetSpot,targetDte,lotSize,multiplier])
  const rangeMin  = spotPrice*0.88, rangeMax = spotPrice*1.12
  const sd        = spotPrice*iv*Math.sqrt(Math.max(targetDte,1)/365)
  const sdMarks   = [-2,-1,1,2].map(n=>({label:`${n>0?'+':''}${n}SD`, x:Math.round(spotPrice+n*sd)}))

  const projPnl = useMemo(()=>{
    if(!enabled.length) return 0
    const T=Math.max(targetDte,1)/365*0.5; let pnl=0
    enabled.forEach(l=>{const m=l.bs==='B'?1:-1,sz=l.lots*lotSize*multiplier;if(l.type==='FUT'){pnl+=(spotPrice-l.price)*m*sz;return};const g=blackScholes({S:spotPrice,K:l.strike,T,r:0.065,sigma:iv,optionType:l.type==='CE'?'call':'put'});pnl+=(g.price-l.price)*m*sz})
    return Math.round(pnl)
  },[enabled,spotPrice,targetDte,lotSize,multiplier,iv])

  // P&L table
  const pnlTable = useMemo(()=>{
    if(!enabled.length) return []
    return [-15,-10,-8,-5,-3,-1,0,1,3,5,8,10,15].map(pct=>{
      const S=spotPrice*(1+pct/100); let pnl=0
      enabled.forEach(l=>{const m=l.bs==='B'?1:-1,sz=l.lots*lotSize*multiplier;if(l.type==='FUT'){pnl+=(S-l.price)*m*sz;return};const intr=l.type==='CE'?Math.max(S-l.strike,0):Math.max(l.strike-S,0);pnl+=(intr-l.price)*m*sz})
      return {pct, spot:Math.round(S), pnl:Math.round(pnl)}
    })
  },[enabled,spotPrice,lotSize,multiplier])

  // Greeks
  const greeks = useMemo(()=>{
    if(!enabled.length) return null
    const T=Math.max(targetDte,1)/365; let delta=0,gamma=0,theta=0,vega=0
    enabled.forEach(l=>{const m=l.bs==='B'?1:-1,sz=l.lots*lotSize*multiplier;if(l.type==='FUT'){delta+=m*sz;return};const g=blackScholes({S:spotPrice,K:l.strike,T,r:0.065,sigma:iv,optionType:l.type==='CE'?'call':'put'});delta+=g.delta*m*sz;gamma+=g.gamma*m*sz;theta+=g.theta*m*sz;vega+=g.vega*m*sz})
    return {delta,gamma,theta,vega}
  },[enabled,spotPrice,targetDte,lotSize,multiplier,iv])

  // Leg mutations
  const priceLeg = useCallback((strike:number, type:'CE'|'PE'|'FUT')=>{
    if(type==='FUT') return mkt?.futures??spotPrice
    return Math.round(blackScholes({S:spotPrice,K:strike,T:30/365,r:0.065,sigma:iv,optionType:type==='CE'?'call':'put'}).price*100)/100
  },[spotPrice,iv,mkt])

  const changeLeg = useCallback((id:string, field:keyof Leg, value:any)=>{
    setLegs(prev=>prev.map(l=>{
      if(l.id!==id) return l
      const u={...l,[field]:value}
      if((field==='strike'||field==='type')&&u.type!=='FUT') u.price=priceLeg(u.strike,u.type)
      return u
    }))
  },[priceLeg])

  const addLeg = useCallback((bs:'B'|'S', type:'CE'|'PE'|'FUT'='CE', strike=atm)=>{
    setLegs(prev=>[...prev,{id:Date.now().toString(),enabled:true,bs,expiry,strike,type,lots:1,price:priceLeg(strike,type)}])
  },[atm,expiry,priceLeg])

  const removeLeg  = useCallback((id:string)=>setLegs(p=>p.filter(l=>l.id!==id)),[])
  const dupLeg     = useCallback((id:string)=>setLegs(p=>{const l=p.find(x=>x.id===id);return l?[...p,{...l,id:Date.now().toString()}]:p}),[])
  const resetPrices= useCallback(()=>{setLegs(p=>p.map(l=>({...l,price:priceLeg(l.strike,l.type)})));addToast('Prices reset','info')},[priceLeg,addToast])
  const clearAll   = useCallback(()=>{setLegs([]);addToast('Cleared','info')},[addToast])

  // Load helper (converts store OptionLeg → local Leg)
  const loadFromStrategy = useCallback((s:typeof savedStrategies[0])=>{
    setLegs(s.legs.map(l=>({
      id:l.id, enabled:true,
      bs:l.direction==='long'?'B':'S',
      expiry:l.expiry, strike:l.strike,
      type:l.instrumentType==='futures'?'FUT':l.optionType==='call'?'CE':'PE',
      lots:l.lots, price:l.premium
    })))
    addToast(`Loaded "${s.name}"`, 'info')
  },[addToast])

  // Save
  const doSave = useCallback(()=>{
    if(!enabled.length){addToast('Add legs first','error');return}
    const name = saveName.trim()||stratName
    const store = useStrategyStore.getState()
    store.clearLegs()
    enabled.forEach(l=>store.addLeg({
      id:l.id, symbol:selectedSymbol, strike:l.strike, expiry:l.expiry,
      optionType:l.type==='CE'?'call':'put',
      direction:l.bs==='B'?'long':'short',
      lots:l.lots, premium:l.price, lotSize,
      instrumentType:l.type==='FUT'?'futures':'option',
    }))
    store.saveStrategy(name)
    setSaveName(''); setSaveModal(false)
  },[enabled,saveName,stratName,selectedSymbol,lotSize,addToast])

  const doDraft = useCallback(()=>{
    if(!enabled.length){addToast('Add legs first','error');return}
    const store=useStrategyStore.getState()
    store.clearLegs()
    enabled.forEach(l=>store.addLeg({id:l.id,symbol:selectedSymbol,strike:l.strike,expiry:l.expiry,optionType:l.type==='CE'?'call':'put',direction:l.bs==='B'?'long':'short',lots:l.lots,premium:l.price,lotSize,instrumentType:l.type==='FUT'?'futures':'option'}))
    store.saveDraft(stratName)
  },[enabled,stratName,selectedSymbol,lotSize])

  const doExport = useCallback(()=>{
    if(!enabled.length){addToast('No legs','error');return}
    const data={strategy:stratName,symbol:selectedSymbol,spot:spotPrice,legs:enabled.map(l=>({bs:l.bs==='B'?'BUY':'SELL',type:l.type,strike:l.strike,expiry:l.expiry,lots:l.lots,price:l.price})),net:Math.round(net)}
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
    Object.assign(document.createElement('a'),{href:url,download:`${stratName.replace(/\s+/g,'_')}.json`}).click()
    URL.revokeObjectURL(url); addToast('Exported','success')
  },[enabled,stratName,selectedSymbol,spotPrice,net,addToast])

  // Ready-made builder helper
  const build = useCallback((defs:{bs:'B'|'S';type:'CE'|'PE'|'FUT';strikeFn:(a:number,t:number)=>number}[])=>{
    setLegs(defs.map((d,i)=>{
      const strike=d.strikeFn(atm,tickSize)
      return {id:(Date.now()+i).toString(),enabled:true,bs:d.bs,expiry,strike,type:d.type,lots:1,price:priceLeg(strike,d.type)}
    }))
    addToast('Strategy loaded','info')
  },[atm,tickSize,expiry,priceLeg,addToast])

  const RM:{[k:string]:{name:string;icon:string;fn:()=>void}[]} = {
    bullish:[
      {name:'Bull Call Spread',icon:'↗',fn:()=>build([{bs:'B',type:'CE',strikeFn:a=>a},{bs:'S',type:'CE',strikeFn:(a,t)=>a+t*4}])},
      {name:'Bull Put Spread', icon:'↗',fn:()=>build([{bs:'S',type:'PE',strikeFn:(a,t)=>a-t*2},{bs:'B',type:'PE',strikeFn:(a,t)=>a-t*6}])},
      {name:'Long Call',       icon:'↑',fn:()=>build([{bs:'B',type:'CE',strikeFn:a=>a}])},
      {name:'Sell Put (CSP)',  icon:'↗',fn:()=>build([{bs:'S',type:'PE',strikeFn:(a,t)=>a-t*3}])},
      {name:'Call Ladder',    icon:'↗',fn:()=>build([{bs:'B',type:'CE',strikeFn:a=>a},{bs:'S',type:'CE',strikeFn:(a,t)=>a+t*3},{bs:'S',type:'CE',strikeFn:(a,t)=>a+t*6}])},
    ],
    bearish:[
      {name:'Bear Put Spread',  icon:'↘',fn:()=>build([{bs:'B',type:'PE',strikeFn:a=>a},{bs:'S',type:'PE',strikeFn:(a,t)=>a-t*4}])},
      {name:'Bear Call Spread', icon:'↘',fn:()=>build([{bs:'S',type:'CE',strikeFn:(a,t)=>a+t*2},{bs:'B',type:'CE',strikeFn:(a,t)=>a+t*6}])},
      {name:'Long Put',         icon:'↓',fn:()=>build([{bs:'B',type:'PE',strikeFn:a=>a}])},
      {name:'Put Ladder',       icon:'↘',fn:()=>build([{bs:'B',type:'PE',strikeFn:a=>a},{bs:'S',type:'PE',strikeFn:(a,t)=>a-t*3},{bs:'S',type:'PE',strikeFn:(a,t)=>a-t*6}])},
    ],
    neutral:[
      {name:'Iron Condor',    icon:'⇔',fn:()=>build([{bs:'B',type:'PE',strikeFn:(a,t)=>a-t*6},{bs:'S',type:'PE',strikeFn:(a,t)=>a-t*3},{bs:'S',type:'CE',strikeFn:(a,t)=>a+t*3},{bs:'B',type:'CE',strikeFn:(a,t)=>a+t*6}])},
      {name:'Short Straddle', icon:'⊥',fn:()=>build([{bs:'S',type:'CE',strikeFn:a=>a},{bs:'S',type:'PE',strikeFn:a=>a}])},
      {name:'Short Strangle', icon:'⊥',fn:()=>build([{bs:'S',type:'CE',strikeFn:(a,t)=>a+t*3},{bs:'S',type:'PE',strikeFn:(a,t)=>a-t*3}])},
      {name:'Butterfly',      icon:'≈',fn:()=>build([{bs:'B',type:'CE',strikeFn:(a,t)=>a-t*3},{bs:'S',type:'CE',strikeFn:a=>a},{bs:'S',type:'CE',strikeFn:a=>a},{bs:'B',type:'CE',strikeFn:(a,t)=>a+t*3}])},
      {name:'Iron Butterfly', icon:'🦋',fn:()=>build([{bs:'B',type:'PE',strikeFn:(a,t)=>a-t*4},{bs:'S',type:'PE',strikeFn:a=>a},{bs:'S',type:'CE',strikeFn:a=>a},{bs:'B',type:'CE',strikeFn:(a,t)=>a+t*4}])},
      {name:'Calendar',       icon:'📅',fn:()=>{const c1=priceLeg(atm,'CE'); setLegs([{id:Date.now().toString(),enabled:true,bs:'S',expiry:EXPIRIES[0],strike:atm,type:'CE',lots:1,price:c1},{id:(Date.now()+1).toString(),enabled:true,bs:'B',expiry:EXPIRIES[1]??EXPIRIES[0],strike:atm,type:'CE',lots:1,price:c1*1.4}]);addToast('Calendar loaded','info')}},
    ],
    others:[
      {name:'Long Straddle',  icon:'⊤',fn:()=>build([{bs:'B',type:'CE',strikeFn:a=>a},{bs:'B',type:'PE',strikeFn:a=>a}])},
      {name:'Long Strangle',  icon:'⊤',fn:()=>build([{bs:'B',type:'CE',strikeFn:(a,t)=>a+t*3},{bs:'B',type:'PE',strikeFn:(a,t)=>a-t*3}])},
      {name:'Synthetic Long', icon:'→',fn:()=>build([{bs:'B',type:'CE',strikeFn:a=>a},{bs:'S',type:'PE',strikeFn:a=>a}])},
      {name:'Synthetic Short',icon:'←',fn:()=>build([{bs:'S',type:'CE',strikeFn:a=>a},{bs:'B',type:'PE',strikeFn:a=>a}])},
      {name:'Long Futures',   icon:'→',fn:()=>build([{bs:'B',type:'FUT',strikeFn:()=>mkt?.futures??spotPrice}])},
      {name:'Short Futures',  icon:'←',fn:()=>build([{bs:'S',type:'FUT',strikeFn:()=>mkt?.futures??spotPrice}])},
      {name:'Fut + Put Hedge',icon:'🛡',fn:()=>build([{bs:'B',type:'FUT',strikeFn:()=>mkt?.futures??spotPrice},{bs:'B',type:'PE',strikeFn:(a,t)=>a-t*3}])},
    ],
  }

  const tPct = ((targetSpot-spotPrice)/spotPrice*100).toFixed(1)

  return (
    <div className="flex h-full" style={{background:'#0d1117'}}>
      {/* ── LEFT ── */}
      <div className="w-[470px] flex-shrink-0 flex flex-col border-r border-[#1e2535]">

        {/* Symbol bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2535]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{selectedSymbol}</span>
            <span className="font-mono text-white text-sm" suppressHydrationWarning>{mounted?spotPrice.toLocaleString('en-IN'):spotPrice}</span>
            <span className={cn("text-xs",(mkt?.changePct??0)>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>{mounted?`${(mkt?.changePct??0)>=0?'+':''}${mkt?.changePct?.toFixed(2)}%`:''}</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={doExport} className="flex items-center gap-1 px-2 py-1 rounded border border-[#2a3040] text-xs text-gray-400 hover:text-gray-200 hover:border-gray-500 cursor-pointer transition-colors"><Download className="h-3 w-3"/>Export</button>
            <button onClick={()=>setSaveModal(true)} className="flex items-center gap-1 px-2 py-1 rounded border border-[#2a3040] text-xs text-gray-400 hover:text-gray-200 hover:border-gray-500 cursor-pointer transition-colors"><Save className="h-3 w-3"/>Save</button>
          </div>
        </div>

        {/* Strategy name bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e2535]">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={enabled.length>0&&enabled.length===legs.length} onChange={e=>setLegs(p=>p.map(l=>({...l,enabled:e.target.checked})))} className="accent-blue-500 w-3.5 h-3.5 cursor-pointer"/>
            <span className="text-sm font-medium text-white">
              {enabled.length>0?<><span className="text-blue-400">{enabled.length} selected</span> — {stratName}</>:'New Strategy'}
            </span>
          </div>
          <button onClick={resetPrices} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"><RefreshCw className="h-3 w-3"/>Reset Prices</button>
        </div>

        {/* Column headers */}
        {legs.length>0&&(
          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-600 border-b border-[#1e2535]">
            <span className="w-3.5"/><span className="w-7 text-center">B/S</span><span className="w-[68px]">Expiry</span><span className="w-[88px] text-center">Strike</span><span className="w-[72px] text-center">Type</span><span className="w-[62px] text-center">Lots</span><span className="w-16 text-right">Price ₹</span>
          </div>
        )}

        {/* Legs */}
        <div className="overflow-y-auto" style={{maxHeight:'200px',minHeight:'50px'}}>
          {legs.length===0
            ?<div className="flex items-center justify-center h-12 text-gray-600 text-xs">Add legs below or pick a ready-made strategy</div>
            :legs.map(l=><LegRow key={l.id} leg={l} tickSize={tickSize} onChange={changeLeg} onRemove={removeLeg} onDuplicate={dupLeg}/>)
          }
        </div>

        {/* Quick add buttons */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-[#1e2535] flex-wrap">
          {([['B','CE','Buy CE','blue'],['S','CE','Sell CE','red'],['B','PE','Buy PE','orange'],['S','PE','Sell PE','orange'],['B','FUT','FUT Long','purple'],['S','FUT','FUT Short','purple']] as const).map(([bs,type,label,color])=>(
            <button key={`${bs}-${type}`} onClick={()=>addLeg(bs,type)}
              className={cn("flex items-center gap-1 px-2 py-1 rounded text-xs border cursor-pointer transition-colors",
                color==='blue'  ?'bg-blue-600/15 border-blue-600/40 text-blue-400 hover:bg-blue-600/25':
                color==='red'   ?'bg-red-600/15 border-red-600/40 text-red-400 hover:bg-red-600/25':
                color==='orange'?'bg-orange-600/15 border-orange-600/40 text-orange-400 hover:bg-orange-600/25':
                                  'bg-purple-600/15 border-purple-600/40 text-purple-400 hover:bg-purple-600/25')}>
              <Plus className="h-2.5 w-2.5"/>{label}
            </button>
          ))}
          {legs.length>0&&<button onClick={clearAll} className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-[#2a3040] text-gray-500 hover:text-red-400 hover:border-red-400/40 cursor-pointer transition-colors ml-auto"><Trash2 className="h-2.5 w-2.5"/>Clear</button>}
        </div>

        {/* Shift / Width controls */}
        <div className="flex items-center gap-4 px-3 py-1.5 border-t border-[#1e2535] text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Shift</span>
            <button onClick={()=>setLegs(p=>p.map(l=>l.type!=='FUT'?{...l,strike:l.strike-tickSize}:l))} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><Minus className="h-2.5 w-2.5"/></button>
            <span className="text-gray-600">—</span>
            <button onClick={()=>setLegs(p=>p.map(l=>l.type!=='FUT'?{...l,strike:l.strike+tickSize}:l))} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><Plus className="h-2.5 w-2.5"/></button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Width</span>
            <button onClick={()=>setLegs(p=>{const h=Math.floor(p.length/2);return p.map((l,i)=>l.type==='FUT'?l:i<h?{...l,strike:l.strike-tickSize}:{...l,strike:l.strike+tickSize})})} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><Minus className="h-2.5 w-2.5"/></button>
            <span className="text-gray-600">—</span>
            <button onClick={()=>setLegs(p=>{const h=Math.floor(p.length/2);return p.map((l,i)=>l.type==='FUT'?l:i<h?{...l,strike:l.strike-tickSize}:{...l,strike:l.strike+tickSize})})} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><Plus className="h-2.5 w-2.5"/></button>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-gray-500">Lots×</span>
            <button onClick={()=>setLegs(p=>p.map(l=>({...l,lots:Math.max(1,l.lots-1)})))} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><Minus className="h-2.5 w-2.5"/></button>
            <span className="font-mono text-gray-300 w-4 text-center">{legs.length?Math.min(...legs.map(l=>l.lots)):1}</span>
            <button onClick={()=>setLegs(p=>p.map(l=>({...l,lots:l.lots+1})))} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><Plus className="h-2.5 w-2.5"/></button>
          </div>
        </div>

        {/* Multiplier + net premium */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#1e2535] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Multiplier</span>
            <select value={multiplier} onChange={e=>setMultiplier(Number(e.target.value))} className="bg-[#1e2535] border border-[#2a3040] rounded px-2 py-0.5 text-gray-200 text-xs cursor-pointer">
              {[1,2,3,5,10,25].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {enabled.length>0&&(
            <span className="font-mono text-gray-400">Net: <span className={cn("font-semibold",net>=0?'text-green-400':'text-orange-400')}>{net>=0?'CR':'DR'} ₹{Math.abs(net).toLocaleString('en-IN',{maximumFractionDigits:0})}</span></span>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-1.5 px-3 py-2 border-t border-[#1e2535]">
          <button onClick={()=>addToast('Order placed (simulated)','success')} className={cn("py-2 rounded text-xs font-medium cursor-pointer transition-colors",enabled.length>0?'bg-blue-600 text-white hover:bg-blue-500':'bg-[#1e2535] text-gray-600 cursor-not-allowed')}>Trade All</button>
          <button onClick={doDraft} className="py-2 rounded bg-[#1a2035] border border-[#2a3040] text-blue-400 text-xs font-medium hover:bg-[#1e2840] cursor-pointer transition-colors"><FileText className="h-3 w-3 inline mr-1"/>Add to Drafts</button>
          <button onClick={()=>setSaveModal(true)} className="py-2 rounded bg-[#1a2035] border border-[#2a3040] text-blue-400 text-xs font-medium hover:bg-[#1e2840] cursor-pointer transition-colors"><Save className="h-3 w-3 inline mr-1"/>Save Strategy</button>
        </div>

        {/* Bottom tabs */}
        <div className="flex border-t border-[#1e2535] overflow-x-auto">
          {([['readymade','Ready-made'],['positions','Positions'],['saved','Saved'],['drafts','Drafts']] as const).map(([id,label])=>(
            <button key={id} onClick={()=>setBottomTab(id)} className={cn("px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer",bottomTab===id?'border-blue-500 text-blue-400':'border-transparent text-gray-500 hover:text-gray-300')}>
              {label}
              {id==='saved'&&savedStrategies.length>0&&<span className="ml-1 bg-blue-600 text-white rounded-full text-[9px] px-1">{savedStrategies.length}</span>}
              {id==='drafts'&&drafts.length>0&&<span className="ml-1 bg-gray-600 text-white rounded-full text-[9px] px-1">{drafts.length}</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto" style={{minHeight:'160px'}}>
          {bottomTab==='readymade'&&(
            <div className="p-2 space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['bullish','bearish','neutral','others'] as const).map(b=>(
                  <button key={b} onClick={()=>setBias(b)} className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize cursor-pointer transition-colors",bias===b?(b==='bullish'?'bg-blue-600 text-white':b==='bearish'?'bg-orange-600 text-white':b==='neutral'?'bg-gray-600 text-white':'bg-purple-600 text-white'):'bg-[#1e2535] text-gray-400 hover:text-gray-200')}>{b}</button>
                ))}
                <div className="ml-auto flex items-center gap-1 text-xs">
                  <span className="text-gray-500">Expiry</span>
                  <select value={expiry} onChange={e=>setExpiry(e.target.value)} className="bg-[#1e2535] border border-[#2a3040] rounded px-1.5 py-0.5 text-gray-300 text-xs cursor-pointer">{EXPIRIES.map(e=><option key={e} value={e}>{e}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(RM[bias]??[]).map(s=>(
                  <button key={s.name} onClick={s.fn} className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-[#1a1f2e] border border-[#2a3040] hover:border-blue-500/50 hover:bg-[#1e2535] cursor-pointer transition-all group">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-[10px] text-gray-400 group-hover:text-gray-200 text-center leading-tight">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {bottomTab==='positions'&&(
            <div className="p-3">
              {savedStrategies.length===0?<p className="text-xs text-gray-600 text-center py-6">No saved strategies</p>:(
                <div className="space-y-1.5">
                  {savedStrategies.map(s=>{
                    const T=15/365; let pnl=0
                    s.legs.forEach(l=>{const m=l.direction==='long'?1:-1,sz=l.lots*l.lotSize;if(l.instrumentType==='futures'){pnl+=(spotPrice-l.premium)*m*sz;return};const g=blackScholes({S:spotPrice,K:l.strike,T,r:0.065,sigma:iv,optionType:l.optionType});pnl+=(g.price-l.premium)*m*sz})
                    return(<div key={s.id} className="flex items-center justify-between p-2 rounded bg-[#1a1f2e] border border-[#2a3040]">
                      <div className="min-w-0"><p className="text-xs font-medium text-gray-200 truncate">{s.name}</p><p className="text-[10px] text-gray-600">{s.legs.length} legs</p></div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn("text-xs font-mono font-bold",pnl>=0?'text-green-400':'text-red-400')}>{pnl>=0?'+':''}₹{Math.round(pnl).toLocaleString()}</span>
                        <button onClick={()=>loadFromStrategy(s)} className="px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 text-[10px] hover:bg-blue-600/40 cursor-pointer">Load</button>
                      </div>
                    </div>)
                  })}
                </div>
              )}
            </div>
          )}
          {bottomTab==='saved'&&(
            <div className="p-3 space-y-1.5">
              {savedStrategies.length===0?<p className="text-xs text-gray-600 text-center py-6">No saved strategies yet</p>:savedStrategies.map(s=>(
                <div key={s.id} className="flex items-center justify-between p-2 rounded bg-[#1a1f2e] border border-[#2a3040] hover:border-blue-500/30 transition-colors">
                  <div className="min-w-0"><p className="text-xs font-medium text-gray-200 truncate">{s.name}</p><p className="text-[10px] text-gray-600">{s.legs.length} legs · {new Date(s.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p></div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={()=>loadFromStrategy(s)} className="px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 text-[10px] hover:bg-blue-600/40 cursor-pointer">Load</button>
                    <button onClick={()=>{deleteStrategy(s.id);addToast('Deleted','info')}} className="p-1 text-gray-600 hover:text-red-400 cursor-pointer"><Trash2 className="h-3 w-3"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {bottomTab==='drafts'&&(
            <div className="p-3 space-y-1.5">
              {drafts.length===0?<p className="text-xs text-gray-600 text-center py-6">No drafts yet</p>:drafts.map(d=>(
                <div key={d.id} className="flex items-center justify-between p-2 rounded bg-[#1a1f2e] border border-[#2a3040]">
                  <div className="min-w-0"><p className="text-xs font-medium text-gray-200 truncate">{d.name}</p><p className="text-[10px] text-gray-600">{d.legs.length} legs</p></div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={()=>loadFromStrategy(d)} className="px-1.5 py-0.5 rounded bg-gray-600/30 text-gray-300 text-[10px] hover:bg-gray-600/50 cursor-pointer">Load</button>
                    <button onClick={()=>deleteDraft(d.id)} className="p-1 text-gray-600 hover:text-red-400 cursor-pointer"><Trash2 className="h-3 w-3"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top tabs */}
        <div className="flex items-center justify-between px-4 border-b border-[#1e2535] flex-shrink-0">
          <div className="flex">
            {([['payoff','Payoff Graph'],['pltable','P&L Table'],['greeks','Greeks']] as const).map(([id,label])=>(
              <button key={id} onClick={()=>setTopTab(id)} className={cn("px-3 py-2.5 text-xs font-medium border-b-2 cursor-pointer transition-colors",topTab===id?'border-blue-500 bg-blue-600/10 text-white':'border-transparent text-gray-500 hover:text-gray-300')}>{label}</button>
            ))}
          </div>
        </div>

        {/* Payoff sub-tabs */}
        {topTab==='payoff'&&(
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#1e2535] flex-shrink-0">
            <div className="flex gap-4">
              {([['graph','Payoff Graph'],['table','Payoff Table']] as const).map(([id,label])=>(
                <button key={id} onClick={()=>setSubTab(id)} className={cn("text-xs font-medium pb-1 border-b-2 cursor-pointer transition-colors",subTab===id?'border-blue-500 text-blue-400':'border-transparent text-gray-500 hover:text-gray-300')}>{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-green-400 inline-block rounded"/>On Expiry</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-cyan-400 inline-block rounded"/>Target Date</span>
            </div>
          </div>
        )}

        {/* Chart / content */}
        <div className="flex-1 overflow-hidden relative px-2 pt-1" style={{minHeight:0}}>
          {/* PAYOFF GRAPH */}
          {topTab==='payoff'&&subTab==='graph'&&(
            enabled.length===0
              ?<div className="flex items-center justify-center h-full text-gray-600 flex-col gap-2"><TrendingUp className="h-10 w-10 opacity-20"/><p className="text-sm">Add legs to see payoff chart</p><p className="text-xs opacity-60">Pick a ready-made strategy or add legs manually</p></div>
              :<>
                <div className="absolute top-4 right-4 z-10 bg-[#1a2035] border border-[#2a3040] rounded px-2 py-1 text-[10px] text-gray-300" suppressHydrationWarning>{mounted?`Spot: ${spotPrice.toLocaleString('en-IN')}`:''}</div>
                <ResponsiveContainer width="100%" height={310}>
                  <ComposedChart data={chartData} margin={{top:5,right:55,left:5,bottom:5}}>
                    <defs>
                      <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.12}/>
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" vertical={false}/>
                    <XAxis dataKey="x" type="number" scale="linear" domain={[Math.round(rangeMin),Math.round(rangeMax)]} tick={{fill:'#4b5563',fontSize:10}} tickFormatter={v=>v>=10000?(v/1000).toFixed(1)+'k':String(v)} axisLine={{stroke:'#1e2535'}} tickLine={false}/>
                    <YAxis yAxisId="p" tick={{fill:'#4b5563',fontSize:10}} tickFormatter={v=>v>=0?`+${(v/1000).toFixed(0)}k`:`${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="o" orientation="right" tick={{fill:'#4b5563',fontSize:9}} tickFormatter={v=>v>=1000?`${(v/100000).toFixed(0)}L`:String(v)} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar yAxisId="o" dataKey="oi" fill="#374151" opacity={0.4} radius={[1,1,0,0]}/>
                    <Area yAxisId="p" type="monotone" dataKey="exp" stroke="none" fill="url(#gGrad)" fillOpacity={1}/>
                    <ReferenceLine yAxisId="p" y={0} stroke="#374151" strokeWidth={1}/>
                    <ReferenceLine yAxisId="p" x={spotPrice} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}/>
                    {sdMarks.map(s=><ReferenceLine key={s.label} yAxisId="p" x={s.x} stroke="#1e2535" strokeDasharray="2 4" strokeWidth={1}/>)}
                    <Line yAxisId="p" type="monotone" dataKey="exp" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{r:3}}/>
                    <Line yAxisId="p" type="monotone" dataKey="tgt" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{r:3}}/>
                  </ComposedChart>
                </ResponsiveContainer>
                {projPnl!==0&&<div className="absolute bottom-20 left-1/2 -translate-x-1/2"><div className={cn("border rounded px-2 py-1 text-[10px] flex items-center gap-1 whitespace-nowrap shadow-lg",projPnl>=0?'bg-green-900/80 border-green-700 text-green-300':'bg-red-900/80 border-red-900/50 text-red-300')}>Projected {projPnl>=0?'profit':'loss'}: {projPnl>=0?'+':''}₹{projPnl.toLocaleString()}<Info className="h-3 w-3"/></div></div>}
              </>
          )}

          {/* P&L TABLE */}
          {topTab==='payoff'&&subTab==='table'&&(
            <div className="overflow-auto h-full">
              {pnlTable.length===0?<div className="flex items-center justify-center h-full text-gray-600 text-sm">Add legs to see P&L table</div>:(
                <table className="w-full text-xs mt-2">
                  <thead><tr className="border-b border-[#1e2535] bg-[#1a1f2e]"><th className="text-left px-4 py-2 text-gray-500 font-medium">Move</th><th className="text-right px-4 py-2 text-gray-500 font-medium">Spot</th><th className="text-right px-4 py-2 text-gray-500 font-medium">P&L at Expiry</th><th className="text-right px-4 py-2 text-gray-500 font-medium">Return%</th></tr></thead>
                  <tbody>
                    {pnlTable.map(r=>(
                      <tr key={r.pct} className={cn("border-b border-[#1e2535]/50 hover:bg-[#1a1f2e]/60",r.pct===0&&"bg-yellow-500/5")}>
                        <td className={cn("px-4 py-2 font-mono",r.pct>0?'text-green-400':r.pct<0?'text-red-400':'text-yellow-400 font-bold')}>{r.pct>0?'+':''}{r.pct}%</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-300">₹{r.spot.toLocaleString('en-IN')}</td>
                        <td className={cn("px-4 py-2 text-right font-mono font-bold",r.pnl>=0?'text-green-400':'text-red-400')}>{r.pnl>=0?'+':''}₹{r.pnl.toLocaleString('en-IN')}</td>
                        <td className={cn("px-4 py-2 text-right font-mono",r.pnl>=0?'text-green-400':'text-red-400')}>{r.pnl>=0?'+':''}{Math.abs(net)>0?(r.pnl/Math.abs(net)*100).toFixed(1):'—'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* GREEKS */}
          {topTab==='greeks'&&(
            <div className="p-4 overflow-auto h-full">
              {!greeks?<div className="flex items-center justify-center h-full text-gray-600 text-sm">Add option legs to see Greeks</div>:(
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {[{label:'Delta (Δ)',value:greeks.delta.toFixed(2),sub:'₹/₹1 spot move',color:greeks.delta>=0?'text-green-400':'text-red-400'},
                      {label:'Gamma (Γ)',value:greeks.gamma.toFixed(5),sub:'Δ per ₹1 move',color:'text-blue-400'},
                      {label:'Theta (Θ)',value:`₹${greeks.theta.toFixed(2)}/day`,sub:'Daily time decay',color:greeks.theta>=0?'text-green-400':'text-red-400'},
                      {label:'Vega (ν)',value:greeks.vega.toFixed(2),sub:'₹ per 1% IV',color:greeks.vega>=0?'text-green-400':'text-red-400'},
                    ].map(g=>(
                      <div key={g.label} className="bg-[#1a1f2e] rounded-lg border border-[#2a3040] p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">{g.label}</p>
                        <p className={cn("text-xl font-mono font-bold tabular",g.color)}>{g.value}</p>
                        <p className="text-[10px] text-gray-600 mt-1">{g.sub}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#1a1f2e] rounded-lg border border-[#2a3040] p-3">
                    <p className="text-xs font-semibold text-gray-300 mb-2">Per-Leg Greeks (at {targetDte}D to expiry)</p>
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-500 border-b border-[#2a3040]"><th className="text-left pb-1.5">Leg</th><th className="text-right pb-1.5">Delta</th><th className="text-right pb-1.5">Theta/d</th><th className="text-right pb-1.5">Vega</th><th className="text-right pb-1.5">Price</th></tr></thead>
                      <tbody>
                        {enabled.map(l=>{
                          const T=Math.max(targetDte,1)/365,m=l.bs==='B'?1:-1,sz=l.lots*lotSize*multiplier
                          if(l.type==='FUT') return <tr key={l.id} className="border-b border-[#2a3040]/50"><td className="py-1.5 text-purple-400">{l.bs==='B'?'Buy':'Sell'} FUT {l.strike}</td><td className="py-1.5 text-right font-mono">{(m*sz).toFixed(0)}</td><td className="py-1.5 text-right font-mono text-gray-500">0</td><td className="py-1.5 text-right font-mono text-gray-500">0</td><td className="py-1.5 text-right font-mono text-gray-400">₹{l.price}</td></tr>
                          const g=blackScholes({S:spotPrice,K:l.strike,T,r:0.065,sigma:iv,optionType:l.type==='CE'?'call':'put'})
                          return <tr key={l.id} className="border-b border-[#2a3040]/50"><td className="py-1.5 text-gray-300">{l.bs==='B'?'Buy':'Sell'} {l.type} {l.strike} ×{l.lots}</td><td className={cn("py-1.5 text-right font-mono",(g.delta*m)>=0?'text-green-400':'text-red-400')}>{(g.delta*m*sz).toFixed(2)}</td><td className={cn("py-1.5 text-right font-mono",(g.theta*m)>=0?'text-green-400':'text-red-400')}>₹{(g.theta*m*sz).toFixed(2)}</td><td className={cn("py-1.5 text-right font-mono",(g.vega*m)>=0?'text-green-400':'text-red-400')}>{(g.vega*m*sz).toFixed(2)}</td><td className="py-1.5 text-right font-mono text-gray-400">₹{l.price}</td></tr>
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sliders ── */}
        <div className="border-t border-[#1e2535] px-4 py-2.5 flex-shrink-0">
          <div className="flex items-center gap-6">
            {/* Target spot */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{selectedSymbol} Target</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs font-mono",Number(tPct)>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>{mounted?`${Number(tPct)>=0?'+':''}${tPct}%`:''}</span>
                  <button onClick={()=>setTargetSpot(s=>s-tickSize)} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><Minus className="h-2.5 w-2.5"/></button>
                  <span className="font-mono text-white text-xs w-20 text-center tabular" suppressHydrationWarning>{mounted?targetSpot.toLocaleString('en-IN'):targetSpot}</span>
                  <button onClick={()=>setTargetSpot(s=>s+tickSize)} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><Plus className="h-2.5 w-2.5"/></button>
                </div>
                <button onClick={()=>setTargetSpot(spotPrice)} className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">Reset</button>
              </div>
              <input type="range" min={Math.round(rangeMin)} max={Math.round(rangeMax)} step={tickSize} value={targetSpot} onChange={e=>setTargetSpot(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{background:`linear-gradient(to right,#3b82f6 0%,#3b82f6 ${Math.max(0,Math.min(100,((targetSpot-rangeMin)/(rangeMax-rangeMin))*100))}%,#1e2535 ${Math.max(0,Math.min(100,((targetSpot-rangeMin)/(rangeMax-rangeMin))*100))}%,#1e2535 100%)`}}/>
              <div className="flex justify-between text-[9px] text-gray-700 mt-0.5"><span>{Math.round(rangeMin).toLocaleString('en-IN')}</span><span>{spotPrice.toLocaleString('en-IN')}</span><span>{Math.round(rangeMax).toLocaleString('en-IN')}</span></div>
            </div>
            {/* DTE slider */}
            <div className="w-56 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">DTE: <span className="text-gray-300">{targetDte}d</span></span>
                <div className="flex items-center gap-1">
                  <button onClick={()=>setTargetDte(d=>Math.max(0,d-1))} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><ChevronLeft className="h-3 w-3"/></button>
                  <button onClick={()=>setTargetDte(d=>Math.min(60,d+1))} className="w-5 h-5 rounded bg-[#1e2535] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer hover:bg-[#2a3040]"><ChevronRight className="h-3 w-3"/></button>
                </div>
                <button onClick={()=>setTargetDte(15)} className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">Reset</button>
              </div>
              <input type="range" min={0} max={60} step={1} value={targetDte} onChange={e=>setTargetDte(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{background:`linear-gradient(to right,#3b82f6 0%,#3b82f6 ${(targetDte/60)*100}%,#1e2535 ${(targetDte/60)*100}%,#1e2535 100%)`}}/>
            </div>
            <button onClick={resetPrices} className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-500 cursor-pointer flex-shrink-0" title="Refresh prices"><RefreshCw className="h-4 w-4 text-white"/></button>
          </div>
        </div>
      </div>

      {/* Save modal */}
      {saveModal&&(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={()=>setSaveModal(false)}>
          <div className="bg-[#0f1420] border border-[#1e2535] rounded-xl p-5 w-80 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <p className="text-sm font-semibold text-white mb-3">Save Strategy</p>
            <input autoFocus type="text" placeholder={stratName} value={saveName} onChange={e=>setSaveName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')doSave();if(e.key==='Escape')setSaveModal(false)}} className="w-full bg-[#1e2535] border border-[#2a3040] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500 mb-3"/>
            <div className="flex gap-2">
              <button onClick={()=>setSaveModal(false)} className="flex-1 py-2 rounded border border-[#2a3040] text-xs text-gray-400 hover:text-gray-200 cursor-pointer transition-colors">Cancel</button>
              <button onClick={doSave} className="flex-1 py-2 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 cursor-pointer transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

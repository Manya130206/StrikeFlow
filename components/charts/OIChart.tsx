"use client"
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import type { OptionChainItem } from '@/lib/types'

interface OIChartProps { chain: OptionChainItem[]; spot: number }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs">
      <p className="text-muted-foreground mb-1">Strike: <span className="text-foreground font-mono">{label}</span></p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {(p.value / 1000).toFixed(0)}K
        </p>
      ))}
    </div>
  )
}

export default function OIChart({ chain, spot }: OIChartProps) {
  const data = useMemo(() => chain.slice(3, -3).map(c => ({
    strike: c.strike,
    'Call OI': c.callOI,
    'Put OI': c.putOI,
  })), [chain])

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barGap={1}>
        <XAxis dataKey="strike" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => (v/1000).toFixed(1)+'k'} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => (v/1000).toFixed(0)+'K'} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={Math.round(spot/50)*50} stroke="#f59e0b" strokeDasharray="4 4" />
        <Bar dataKey="Call OI" fill="#22c55e" fillOpacity={0.7} radius={[2,2,0,0]}>
          {data.map((d, i) => <Cell key={i} fill={d.strike >= spot ? '#22c55e' : '#16a34a'} fillOpacity={0.7} />)}
        </Bar>
        <Bar dataKey="Put OI" fill="#ef4444" fillOpacity={0.7} radius={[2,2,0,0]}>
          {data.map((d, i) => <Cell key={i} fill={d.strike <= spot ? '#ef4444' : '#b91c1c'} fillOpacity={0.7} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

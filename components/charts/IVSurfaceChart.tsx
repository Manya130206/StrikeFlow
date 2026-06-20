"use client"
import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { generateIVSurface } from '@/lib/mockData'

interface IVSurfaceChartProps { spot: number }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs">
      <p>Strike: <span className="font-mono">{d.x}</span></p>
      <p>DTE: <span className="font-mono">{d.y}d</span></p>
      <p>IV: <span className="font-mono text-primary">{d.z.toFixed(1)}%</span></p>
    </div>
  )
}

export default function IVSurfaceChart({ spot }: IVSurfaceChartProps) {
  const data = useMemo(() => {
    const surface = generateIVSurface(spot)
    return surface.map(p => ({
      x: p.strike, y: p.dte, z: p.iv,
      fill: p.iv > 20 ? '#ef4444' : p.iv > 16 ? '#f59e0b' : p.iv > 13 ? '#22c55e' : '#818cf8'
    }))
  }, [spot])

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#818cf8] inline-block"/> &lt;13%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"/> 13-16%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"/> 16-20%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"/> &gt;20%</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 20%)" />
          <XAxis dataKey="x" type="number" name="Strike" tick={{ fill: '#94a3b8', fontSize: 11 }}
            domain={['auto', 'auto']} tickFormatter={v => (v/1000).toFixed(0)+'k'} label={{ value: 'Strike', position: 'bottom', fill: '#64748b', fontSize: 11 }} />
          <YAxis dataKey="y" type="number" name="DTE" tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={{ value: 'DTE', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
          <ZAxis dataKey="z" range={[30, 200]} />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} shape={(props: any) => {
            const { cx, cy, payload } = props
            return <circle cx={cx} cy={cy} r={props.r || 6} fill={payload.fill} fillOpacity={0.8} />
          }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

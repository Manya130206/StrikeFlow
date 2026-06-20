/**
 * StrikeFlow API Client
 * Connects frontend to FastAPI backend — falls back to mock data if unavailable
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch {
    // Silently fall back to mock data — backend may not be running
    return null
  }
}

export const api = {
  // Market data
  getSnapshot: () => apiFetch<{ data: any[] }>("/market/snapshot"),
  getChain:    (symbol: string, dte = 30) => apiFetch<{ chain: any[] }>(`/market/chain/${symbol}?dte=${dte}`),
  getHistory:  (symbol: string, days = 90) => apiFetch<{ data: any[] }>(`/market/history/${symbol}?days=${days}`),
  getIVSurface:(symbol: string) => apiFetch<{ surface: any[] }>(`/market/iv-surface/${symbol}`),

  // Pricing
  priceOption: (body: object) => apiFetch<any>("/pricing/bs", { method: "POST", body: JSON.stringify(body) }),
  computeIV:   (body: object) => apiFetch<any>("/pricing/iv", { method: "POST", body: JSON.stringify(body) }),
  getPayoff:   (legs: object[]) => apiFetch<any>("/pricing/payoff", { method: "POST", body: JSON.stringify({ legs }) }),

  // Strategies (persisted in DB)
  listStrategies:  () => apiFetch<any[]>("/strategies/"),
  createStrategy:  (body: object) => apiFetch<any>("/strategies/", { method: "POST", body: JSON.stringify(body) }),
  deleteStrategy:  (id: number) => apiFetch<void>(`/strategies/${id}`, { method: "DELETE" }),
  updateStrategy:  (id: number, body: object) => apiFetch<any>(`/strategies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
}

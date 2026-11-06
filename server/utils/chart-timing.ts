// 거래소 차트 화면 갱신 주기(밀리초). ADMIN > 설정 > 차트 갱신주기에서 바꾸며 테스트/거래소에 같이 적용된다.
export const CHART_TIMING_DEFAULTS = { chartMs: 200, orderbookMs: 500, tradesMs: 1000, markPosMs: 1000, markIdleMs: 1500 }
export const CHART_TIMING_LIMITS: Record<keyof typeof CHART_TIMING_DEFAULTS, [number, number]> = {
  chartMs: [50, 5000],
  orderbookMs: [100, 5000],
  tradesMs: [300, 10000],
  markPosMs: [300, 10000],
  markIdleMs: [300, 10000]
}
export function normalizeChartTiming(raw: any) {
  const out = { ...CHART_TIMING_DEFAULTS }
  for (const k of Object.keys(CHART_TIMING_DEFAULTS) as Array<keyof typeof CHART_TIMING_DEFAULTS>) {
    const v = Number(raw?.[k])
    if (!Number.isFinite(v) || v <= 0) continue
    const [min, max] = CHART_TIMING_LIMITS[k]
    out[k] = Math.round(Math.min(max, Math.max(min, v)))
  }
  return out
}

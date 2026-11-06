import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { CHART_TIMING_DEFAULTS, CHART_TIMING_LIMITS, normalizeChartTiming } from '../../../utils/chart-timing'

// 거래소 차트 화면 갱신 주기 읽기(테스트/거래소 공통)
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const supa = getSupabaseAdminClient()
  const { data, error } = await supa.from('bitduck_system_settings').select('chart_timing').eq('id', 1).maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { timing: normalizeChartTiming((data as any)?.chart_timing), defaults: CHART_TIMING_DEFAULTS, limits: CHART_TIMING_LIMITS }
})

import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { logAdminAction } from '../../../utils/supa-log'
import { normalizeChartTiming } from '../../../utils/chart-timing'

// 거래소 차트 화면 갱신 주기 저장(밀리초). 테스트/거래소 차트 화면이 30초 안에 새 값으로 바뀐다.
const BodySchema = z.object({
  chartMs: z.number(),
  orderbookMs: z.number(),
  tradesMs: z.number(),
  markPosMs: z.number(),
  markIdleMs: z.number()
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const timing = normalizeChartTiming(BodySchema.parse(await readBody(event)))
  const supa = getSupabaseAdminClient()
  const { error } = await supa.from('bitduck_system_settings').update({ chart_timing: timing }).eq('id', 1)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await logAdminAction(event, { adminUserId: admin.id, action: 'settings_chart_timing_update', targetType: 'system_settings', targetId: null, detail: timing })
  return { ok: true, timing }
})

import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { logAdminAction } from '../../../utils/supa-log'

// [임시 · 보여주기용] 차트 화면 덤프오류 on/off 와 생성시간(n~n초) 저장 — site: ktx(거래소) | test(테스트)
const BodySchema = z.object({
  site: z.enum(['ktx', 'test']),
  enabled: z.boolean(),
  minSec: z.number().int().min(0).max(86400),
  maxSec: z.number().int().min(0).max(86400)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const minSec = Math.min(body.minSec, body.maxSec)
  const maxSec = Math.max(body.minSec, body.maxSec)
  const p = body.site === 'test' ? 'dump_error_test_' : 'dump_error_'
  const supa = getSupabaseAdminClient()
  const { error } = await supa
    .from('bitduck_system_settings')
    .update({ [`${p}enabled`]: body.enabled, [`${p}min_sec`]: minSec, [`${p}max_sec`]: maxSec })
    .eq('id', 1)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await logAdminAction(event, { adminUserId: admin.id, action: 'settings_dump_error_update', targetType: 'system_settings', targetId: null, detail: { site: body.site, enabled: body.enabled, minSec, maxSec } })
  return { ok: true, site: body.site, enabled: body.enabled, minSec, maxSec }
})

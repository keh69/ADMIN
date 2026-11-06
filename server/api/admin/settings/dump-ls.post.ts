import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { logAdminAction } from '../../../utils/supa-log'

// [임시 · 보여주기용] 롱숏 덤프 on/off 와 확률(%) 저장 — site: ktx(거래소) | test(테스트)
// ON이면 그 사이트 차트 화면에서 회원이 롱/숏 버튼을 누를 때 pct% 확률로 덤프오류 페이지로 넘어간다.
const BodySchema = z.object({
  site: z.enum(['ktx', 'test']),
  enabled: z.boolean(),
  pct: z.number().min(0).max(100)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const pct = Math.round(body.pct * 100) / 100
  const p = body.site === 'test' ? 'dump_ls_test_' : 'dump_ls_'
  const supa = getSupabaseAdminClient()
  const { error } = await supa
    .from('bitduck_system_settings')
    .update({ [`${p}enabled`]: body.enabled, [`${p}pct`]: pct })
    .eq('id', 1)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await logAdminAction(event, { adminUserId: admin.id, action: 'settings_dump_ls_update', targetType: 'system_settings', targetId: null, detail: { site: body.site, enabled: body.enabled, pct } })
  return { ok: true, site: body.site, enabled: body.enabled, pct }
})

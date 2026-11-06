import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000),
  enabled: z.boolean(),
  prizes: z
    .array(z.object({ rank: z.string().trim().min(1).max(30), reward: z.string().trim().min(1).max(60) }))
    .max(20)
})

// 이벤트 수정(제목/설명/상금/진행 여부). 테스트·거래소 이벤트는 각각 따로 저장된다.
export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: '잘못된 이벤트 번호입니다.' })
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.' })
  const b = parsed.data
  const { error } = await getSupabaseAdminClient()
    .from('bitduck_events')
    .update({ title: b.title, description: b.description, enabled: b.enabled, prizes: b.prizes, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  await logAdminAction(event, { adminUserId: admin.id, action: 'event_update', targetType: 'event', targetId: id, detail: { enabled: b.enabled } })
  return { ok: true }
})

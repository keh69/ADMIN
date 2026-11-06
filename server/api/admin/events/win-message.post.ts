import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  subject: z.string().trim().max(100),
  body: z.string().trim().max(4000)
})

// 당첨 쪽지 문구 저장(비우면 기본 문구 사용)
export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const b = BodySchema.parse(await readBody(event))
  const { error } = await getSupabaseAdminClient().from('bitduck_system_settings').update({ event_win_subject: b.subject, event_win_message: b.body }).eq('id', 1)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await logAdminAction(event, { adminUserId: admin.id, action: 'event_win_message_update', targetType: 'system_settings', targetId: null, detail: {} })
  return { ok: true }
})

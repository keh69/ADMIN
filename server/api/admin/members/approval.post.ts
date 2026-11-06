import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { canEditMenu } from '../../../utils/menu-permissions'
import { assertUserInScope } from '../../../utils/referral'
import { logAdminAction } from '../../../utils/supa-log'

// 회원 가입 승인상태 변경: approved(승인) / rejected(거절) / pending(대기)
// - 새로 가입한 회원은 pending(대기)이라 로그인할 수 없다(거래소 로그인에서 "가입승인 대기중입니다." 팝업).
// - rejected(거절)는 로그인하면 아무 안내 없이 홈페이지 첫 화면으로 보낸다.
// - 승인이 아닌 상태로 바꾸면 그 회원의 로그인 세션을 끊는다.
const BodySchema = z.object({
  userId: z.number().int().positive(),
  status: z.enum(['approved', 'rejected', 'pending'])
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canEditMenu(admin, 'members')) {
    throw createError({ statusCode: 403, statusMessage: '회원 목록 수정 권한이 없습니다.' })
  }
  const body = BodySchema.parse(await readBody(event))
  if (!supabaseAppDbEnabled()) throw createError({ statusCode: 400, statusMessage: '이 환경에서는 바꿀 수 없습니다.' })
  await assertUserInScope(admin, body.userId)
  const supa = getSupabaseAdminClient()
  const { data: target } = await supa.from('bitduck_users').select('id, username, role').eq('id', body.userId).maybeSingle()
  if (!target) throw createError({ statusCode: 404, statusMessage: '회원을 찾을 수 없습니다.' })
  if ((target as any).role === 'super_admin' && body.status !== 'approved') {
    throw createError({ statusCode: 400, statusMessage: '최고관리자는 승인 상태만 가능합니다.' })
  }
  const { error } = await supa.from('bitduck_users').update({ approval_status: body.status, updated_at: new Date().toISOString() }).eq('id', body.userId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (body.status !== 'approved') {
    await supa.from('bitduck_sessions').delete().eq('user_id', body.userId)
  }
  await logAdminAction(event, { adminUserId: admin.id, action: 'member_approval', targetType: 'user', targetId: body.userId, detail: { status: body.status, username: (target as any).username } })
  return { ok: true, status: body.status }
})

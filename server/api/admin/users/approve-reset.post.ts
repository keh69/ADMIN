import { readBody } from 'h3'
import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { approvePasswordReset } from '../../../utils/password-reset'
import { logAdminAction } from '../../../utils/supa-log'
import { recordProfileHistory } from '../../../utils/account-security'

const BodySchema = z.object({
  requestId: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const res = await approvePasswordReset(body.requestId, admin)
  await logAdminAction(event, { adminUserId: admin.id, action: 'password_reset_approve', targetType: 'user', targetId: body.requestId })
  if (res?.userId) {
    await recordProfileHistory(event, {
      userId: res.userId,
      username: res.username,
      actor: { id: Number(admin.id), username: String(admin.username), role: String(admin.role) },
      source: 'admin',
      changes: [{ field: 'password', label: '비밀번호', before: '', after: '초기화 요청 승인(1234) · 접속제한 해제' }]
    })
  }
  return { ok: true }
})

import { readBody, createError } from 'h3'
import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { MESSAGE_IMAGE_MAX_COUNT, stripImageTokens, uploadMessageImages } from '../../utils/message-images'
import { getVisibleScope } from '../../utils/referral'
import { canEditMenu } from '../../utils/menu-permissions'
import { ensureAdminThreadAccess, getOperatorAdminUser, insertMessages, listMessageRecipientsForAdmin, threadKeyForUser } from '../../utils/messages'

const BodySchema = z.object({
  userIds: z.array(z.number().int().positive()).optional(),
  sendToAll: z.boolean().optional(),
  subject: z.string().trim().max(100).optional(),
  body: z.string().trim().max(5000).optional().default(''),
  // 고객센터 쪽지 첨부 이미지(data URL). 브라우저에서 줄여서 보낸다.
  images: z.array(z.string().max(3_500_000)).max(MESSAGE_IMAGE_MAX_COUNT).optional()
})

// 입력한 글 + 첨부 이미지 표시([[img:…]])를 합친 실제 저장 본문
async function composeBody(threadUserId: number, text: string, images: string[] | undefined) {
  const clean = stripImageTokens(text).trim()
  const tokens = await uploadMessageImages(threadUserId, images || [])
  return [clean, ...tokens].filter(Boolean).join('\n')
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const hasImages = Boolean(body.images && body.images.length)
  if (!stripImageTokens(body.body).trim() && !hasImages) {
    throw createError({ statusCode: 400, statusMessage: '내용을 입력하세요.' })
  }
  const isAdmin = user.role !== 'user'
  const operator = await getOperatorAdminUser()
  if (!operator) {
    throw createError({ statusCode: 500, statusMessage: '운영자 계정을 찾을 수 없습니다.' })
  }

  if (isAdmin) {
    if (!canEditMenu(user, 'messages')) {
      throw createError({ statusCode: 403, statusMessage: '어드민권한이 없어 쪽지를 보낼 수 없습니다.' })
    }
    let targetIds = (body.userIds || []).map((v) => Number(v)).filter(Boolean)
    if (body.sendToAll) {
      const users = await listMessageRecipientsForAdmin()
      targetIds = users.map((u) => Number(u.id))
    }
    targetIds = Array.from(new Set(targetIds)).filter((id) => id !== operator.id)
    // 총관리자가 아니면 내 하부 회원에게만 보낼 수 있다.
    const scope = await getVisibleScope(user)
    if (scope) targetIds = targetIds.filter((id) => scope.ids.has(Number(id)))
    if (!targetIds.length) {
      throw createError({ statusCode: 400, statusMessage: '수신 회원을 선택하세요.' })
    }
    if (hasImages && targetIds.length !== 1) {
      throw createError({ statusCode: 400, statusMessage: '이미지는 한 회원과의 대화에서만 보낼 수 있습니다.' })
    }
    const adminBody = await composeBody(targetIds[0], body.body, body.images)

    await insertMessages(
      targetIds.map((uid) => ({
        thread_key: threadKeyForUser(uid),
        sender_id: Number(user.id),
        recipient_id: uid,
        subject: String(body.subject || '운영자 쪽지'),
        body: adminBody,
        read_at: null
      }))
    )
    return { ok: true, count: targetIds.length }
  }

  await ensureAdminThreadAccess(user)
  const memberBody = await composeBody(Number(user.id), body.body, body.images)
  await insertMessages([
    {
      thread_key: threadKeyForUser(user.id),
      sender_id: Number(user.id),
      recipient_id: Number(operator.id),
      subject: String(body.subject || '회원 문의'),
      body: memberBody,
      read_at: null
    }
  ])
  return { ok: true, count: 1 }
})

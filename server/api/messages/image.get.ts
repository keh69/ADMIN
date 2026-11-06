import { getQuery, createError, setHeader } from 'h3'
import { requireUser } from '../../utils/auth'
import { ensureAdminThreadAccess } from '../../utils/messages'
import { downloadMessageImage, parseMessageImagePath } from '../../utils/message-images'

// 고객센터 쪽지에 첨부된 이미지 보기. 그 대화의 회원 본인 또는 그 대화를 볼 수 있는 관리자만 받을 수 있다.
// 한 번 받은 그림은 내용이 바뀌지 않으므로 브라우저에 1년 보관(다시 받지 않음 → 데이터 절약).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const path = String(getQuery(event).p || '')
  const info = parseMessageImagePath(path)
  if (!info) throw createError({ statusCode: 400, statusMessage: '잘못된 이미지 주소입니다.' })
  if (user.role === 'user') {
    if (Number(user.id) !== info.ownerUserId) throw createError({ statusCode: 403, statusMessage: '볼 수 없는 이미지입니다.' })
  } else {
    await ensureAdminThreadAccess(user, info.ownerUserId)
  }
  const file = await downloadMessageImage(path)
  if (!file) throw createError({ statusCode: 404, statusMessage: '이미지를 찾을 수 없습니다.' })
  setHeader(event, 'Content-Type', file.mime)
  setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return file.buf
})

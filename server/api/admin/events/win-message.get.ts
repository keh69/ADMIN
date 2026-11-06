import { requireSuperAdmin } from '../../../utils/auth'
import { DEFAULT_WIN_MESSAGE, DEFAULT_WIN_SUBJECT, getWinMessageTemplate } from '../../../utils/event-engine'

// 당첨 쪽지 문구(모든 이벤트 공통). [제목] [순위] [당첨금]이 실제 값으로 바뀌어 발송된다.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const tpl = await getWinMessageTemplate()
  return { subject: tpl.subject, body: tpl.body, defaultSubject: DEFAULT_WIN_SUBJECT, defaultBody: DEFAULT_WIN_MESSAGE }
})

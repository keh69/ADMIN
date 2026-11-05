import { requireAdmin } from '../../utils/auth'

// 관리자만 볼 수 있다(회원/비로그인 차단)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return {
    ok: true,
    lastError: (globalThis as any).__LAST_ERROR__ || null
  }
})


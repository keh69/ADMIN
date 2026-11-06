import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'

// 한국어 → 영어 자동 번역(구글 번역). 이벤트 영어 제목/설명을 채울 때 쓴다.
const BodySchema = z.object({ text: z.string().max(5000), to: z.string().regex(/^[a-z-]{2,5}$/).optional().default('en') })

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const { text, to } = BodySchema.parse(await readBody(event))
  if (!text.trim()) return { text: '' }
  try {
    let res: any = await $fetch('https://translate.googleapis.com/translate_a/single', {
      method: 'POST',
      query: { client: 'gtx', sl: 'ko', tl: to, dt: 't' },
      body: new URLSearchParams({ q: text }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      timeout: 8000
    })
    if (typeof res === 'string') res = JSON.parse(res)
    const out = Array.isArray(res?.[0]) ? res[0].map((s: any) => (Array.isArray(s) ? String(s[0] ?? '') : '')).join('') : ''
    return { text: out }
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: '번역에 실패했습니다. 잠시 후 다시 시도하세요.' })
  }
})

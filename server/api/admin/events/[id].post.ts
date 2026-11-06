import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { logAdminAction } from '../../../utils/supa-log'
import { isEventKind } from '../../../utils/event-engine'

const BodySchema = z.object({
  title: z.string().trim().min(1, '제목을 입력하세요.').max(100),
  description: z.string().trim().max(2000),
  // 영어 화면용(한국어를 자동 번역해서 채운다. 비우면 회원 화면에서 한국어가 그대로 보인다)
  titleEn: z.string().trim().max(200).optional().default(''),
  descriptionEn: z.string().trim().max(4000).optional().default(''),
  // 사이트별 진행: 테스트(진행) / 거래소(진행)
  enabledTest: z.boolean(),
  enabledKtx: z.boolean(),
  // 이벤트 페이지 첫 화면 픽셀아트 어셋(1~10)
  asset: z.number().int().min(1).max(10).optional().default(1),
  kind: z.string().refine(isEventKind, '이벤트 종류가 올바르지 않습니다.'),
  // 마감: 매주 closeDow(0=월~6=일) closeTime(HH:MM, 한국시간)
  closeDow: z.number().int().min(0).max(6),
  closeTime: z.string().regex(/^\d{1,2}:\d{2}$/, '마감 시각은 00:00 형식으로 입력하세요.'),
  // 상금: 순위 "1" 또는 "5~10", 상금은 USDT 숫자
  prizes: z
    .array(
      z.object({
        rank: z.string().trim().regex(/^\d+(\s*~\s*\d+)?$/, '순위는 1 또는 5~10 처럼 숫자로 입력하세요.'),
        reward: z.string().trim().regex(/^\d+(\.\d+)?$/, '상금은 숫자만 입력하세요.')
      })
    )
    .max(30)
})

// 이벤트 수정. 테스트·거래소 이벤트는 각각 따로 저장된다.
export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: '잘못된 이벤트 번호입니다.' })
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.' })
  const b = parsed.data
  const supa = getSupabaseAdminClient()
  const { data: cur } = await supa.from('bitduck_events').select('enabled, site').eq('id', id).maybeSingle()
  // 두 사이트 중 하나라도 진행이면 이벤트가 진행 중(마감 정산 대상). 상금은 사이트와 상관없이 회차마다 한 번만 지급된다.
  const enabled = b.enabledTest || b.enabledKtx
  const [hh, mm] = b.closeTime.split(':').map((v) => Number(v))
  const closeTime = `${String(Math.min(23, hh || 0)).padStart(2, '0')}:${String(Math.min(59, mm || 0)).padStart(2, '0')}`
  const update: Record<string, any> = {
    title: b.title,
    description: b.description,
    title_en: b.titleEn,
    description_en: b.descriptionEn,
    enabled,
    enabled_test: b.enabledTest,
    enabled_ktx: b.enabledKtx,
    kind: b.kind,
    asset: b.asset,
    close_dow: b.closeDow,
    close_time: closeTime,
    prizes: b.prizes.map((p) => ({ rank: p.rank.replace(/\s+/g, ''), reward: p.reward })),
    updated_at: new Date().toISOString()
  }
  // 꺼져 있던 이벤트를 켜면, 켠 뒤에 끝나는 회차부터 상금을 지급한다(꺼져 있던 동안의 회차는 지급하지 않음).
  if (enabled && cur && !(cur as any).enabled) update.settle_from = new Date().toISOString()
  // 예전 사이트별 행을 고치면 공통 이벤트로 바꾼다
  if (cur && (cur as any).site !== 'all') update.site = 'all'
  const { error } = await supa.from('bitduck_events').update(update).eq('id', id)
  if (error) throw error
  await logAdminAction(event, { adminUserId: admin.id, action: 'event_update', targetType: 'event', targetId: id, detail: { enabledTest: b.enabledTest, enabledKtx: b.enabledKtx, kind: b.kind, closeDow: b.closeDow, closeTime } })
  return { ok: true }
})

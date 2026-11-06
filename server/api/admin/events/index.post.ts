import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { logAdminAction } from '../../../utils/supa-log'
import { EVENT_KINDS, isEventKind } from '../../../utils/event-engine'

// 이벤트 추가: 사이트(테스트/거래소)마다 이벤트N 번호를 이어서 붙인다. 처음에는 꺼진 상태(설정 후 켜기).
const BodySchema = z.object({
  site: z.enum(['test', 'ktx']),
  kind: z.string().refine(isEventKind, '이벤트 종류가 올바르지 않습니다.'),
  title: z.string().trim().min(1, '제목을 입력하세요.').max(100)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.' })
  const b = parsed.data
  const supa = getSupabaseAdminClient()
  const { data: existing } = await supa.from('bitduck_events').select('code').eq('site', b.site)
  const maxN = Math.max(0, ...((existing || []) as any[]).map((r) => Number(String(r.code).replace(/\D/g, '')) || 0))
  const n = maxN + 1
  const meta = EVENT_KINDS[b.kind as keyof typeof EVENT_KINDS]
  const { data, error } = await supa
    .from('bitduck_events')
    .insert({
      site: b.site,
      code: `event${n}`,
      name: `이벤트${n}`,
      kind: b.kind,
      title: b.title,
      description: `${meta.descKo}으로 순위를 매겨 회차가 마감되면 상금을 지급합니다.`,
      prizes: [
        { rank: '1', reward: '1000' },
        { rank: '2', reward: '500' },
        { rank: '3', reward: '300' }
      ],
      enabled: false,
      close_dow: 0,
      close_time: '00:00'
    })
    .select('id')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await logAdminAction(event, { adminUserId: admin.id, action: 'event_create', targetType: 'event', targetId: Number((data as any).id), detail: { site: b.site, kind: b.kind } })
  return { ok: true, id: Number((data as any).id) }
})

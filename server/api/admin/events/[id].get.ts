import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { eventMenuLabel } from '../../../utils/events'
import { DOW_KO, EVENT_KINDS, eventCycleRange, eventRank, isEventKind } from '../../../utils/event-engine'

// 이벤트 상세 + 순위(관리자 화면이라 아이디를 가리지 않는다) + 최근 지급 내역
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: '잘못된 이벤트 번호입니다.' })
  const supa = getSupabaseAdminClient()
  const { data, error } = await supa.from('bitduck_events').select('*').eq('id', id).limit(1)
  if (error) throw error
  const row: any = (data || [])[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: '이벤트를 찾을 수 없습니다.' })
  const week = String(getQuery(event).week || '') === 'last' ? -1 : 0
  const { from, to } = eventCycleRange(row, week)
  const kind = isEventKind(row.kind) ? row.kind : 'weekly_volume'
  const ranking = await eventRank(kind, from, to, 100)
  const { data: payouts } = await supa
    .from('bitduck_event_payouts')
    .select('period_from, period_to, user_id, username, rank, score, amount, message_sent, paid_at')
    .eq('event_id', id)
    .order('paid_at', { ascending: false })
    .order('rank', { ascending: true })
    .limit(100)
  return {
    event: {
      id: Number(row.id),
      site: String(row.site),
      code: String(row.code),
      name: String(row.name),
      kind,
      title: String(row.title || ''),
      description: String(row.description || ''),
      nameEn: String(row.name_en || ''),
      titleEn: String(row.title_en || ''),
      descriptionEn: String(row.description_en || ''),
      prizes: Array.isArray(row.prizes) ? row.prizes : [],
      enabled: !!row.enabled,
      // 사이트별 진행(체크하면 그 사이트에 이벤트 메뉴가 보이고 진행)
      enabledTest: row.site === 'all' ? !!row.enabled_test : row.site === 'test' && !!row.enabled,
      enabledKtx: row.site === 'all' ? !!row.enabled_ktx : row.site === 'ktx' && !!row.enabled,
      closeDow: Number(row.close_dow) || 0,
      closeTime: String(row.close_time || '00:00'),
      label: eventMenuLabel(row),
      updatedAt: String(row.updated_at || '')
    },
    kinds: Object.entries(EVENT_KINDS).map(([key, m]) => ({ key, label: m.ko, score: m.scoreKo, unit: m.unit, decimals: m.decimals, desc: m.descKo })),
    dows: DOW_KO,
    period: { from: from.toISOString(), to: to.toISOString(), week: week === -1 ? 'last' : 'this' },
    ranking,
    payouts: (payouts || []).map((p: any) => ({
      periodFrom: String(p.period_from),
      periodTo: String(p.period_to),
      userId: Number(p.user_id),
      username: String(p.username || ''),
      rank: Number(p.rank),
      score: Number(p.score) || 0,
      amount: Number(p.amount) || 0,
      messageSent: !!p.message_sent,
      paidAt: String(p.paid_at)
    }))
  }
})

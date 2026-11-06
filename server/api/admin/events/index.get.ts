import { requireSuperAdmin } from '../../../utils/auth'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { eventMenuLabel } from '../../../utils/events'
import { EVENT_KINDS, isEventKind, settleDueEventsThrottled } from '../../../utils/event-engine'

// 이벤트 목록(테스트/거래소 전부). 이벤트 화면 상단에서 이벤트를 고를 때 쓴다.
// 여기서 마감된 회차가 있으면 상금 지급도 같이 확인한다(1분에 한 번).
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  if (!supabaseAppDbEnabled()) return { items: [] }
  await settleDueEventsThrottled()
  const { data, error } = await getSupabaseAdminClient()
    .from('bitduck_events')
    .select('id, site, code, name, title, kind, enabled, enabled_test, enabled_ktx')
    .neq('site', 'merged') // 합치고 보관한 예전 행은 빼고
    .order('code', { ascending: true })
  if (error) throw error
  const num = (c: string) => Number(String(c).replace(/\D/g, '')) || 0
  const rows = (data || []).slice().sort((a: any, b: any) => num(a.code) - num(b.code) || String(b.site).localeCompare(String(a.site)))
  return {
    items: rows.map((r: any) => ({
      id: Number(r.id),
      site: String(r.site),
      code: String(r.code),
      name: String(r.name),
      title: String(r.title || ''),
      kind: String(r.kind || 'weekly_volume'),
      kindLabel: isEventKind(r.kind) ? EVENT_KINDS[r.kind].ko : String(r.kind || ''),
      enabled: !!r.enabled,
      enabledTest: r.site === 'all' ? !!r.enabled_test : r.site === 'test' && !!r.enabled,
      enabledKtx: r.site === 'all' ? !!r.enabled_ktx : r.site === 'ktx' && !!r.enabled,
      label: eventMenuLabel(r)
    }))
  }
})

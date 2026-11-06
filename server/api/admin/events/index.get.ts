import { requireSuperAdmin } from '../../../utils/auth'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { eventMenuLabel } from '../../../utils/events'

// 상단 [이벤트] 드롭다운: 테스트/거래소 이벤트 전부(예: 이벤트1(테스트), 이벤트1(거래소))
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  if (!supabaseAppDbEnabled()) return { items: [] }
  const { data, error } = await getSupabaseAdminClient()
    .from('bitduck_events')
    .select('id, site, code, name, title, enabled')
    .order('code', { ascending: true })
    .order('site', { ascending: false }) // 같은 이벤트는 테스트 → 거래소 순
  if (error) throw error
  return {
    items: (data || []).map((r: any) => ({
      id: Number(r.id),
      site: String(r.site),
      code: String(r.code),
      name: String(r.name),
      title: String(r.title || ''),
      enabled: !!r.enabled,
      label: eventMenuLabel(r)
    }))
  }
})

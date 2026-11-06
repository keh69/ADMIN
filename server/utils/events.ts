import { getSupabaseAdminClient } from './supabase'
import { supabaseAppDbEnabled } from './supa-appdb'

// 이벤트는 테스트(keh69/test)와 거래소(keh69/KTX)가 같은 Supabase의 bitduck_events를 같이 쓰고, site 컬럼으로 나뉜다.
export const SITE_LABEL: Record<string, string> = { test: '테스트', ktx: '거래소' }

export function eventMenuLabel(row: { name: string; site: string }) {
  return `${row.name}(${SITE_LABEL[row.site] || row.site})`
}

// 이번 주(한국시간 월요일 00:00 ~ 다음 월요일 00:00). offsetWeeks=-1이면 지난주.
export function kstWeekRange(offsetWeeks = 0, nowMs = Date.now()) {
  const KST = 9 * 3600 * 1000
  const k = new Date(nowMs + KST)
  const dow = (k.getUTCDay() + 6) % 7
  const startKst = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - dow + offsetWeeks * 7)
  return { from: new Date(startKst - KST), to: new Date(startKst - KST + 7 * 24 * 3600 * 1000) }
}

export async function weeklyVolumeRank(from: Date, to: Date, limit = 100) {
  if (!supabaseAppDbEnabled()) return []
  const { data, error } = await getSupabaseAdminClient().rpc('bitduck_event_volume_rank', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_limit: limit,
    p_user: null
  })
  if (error) throw error
  return ((data || []) as any[]).map((r) => ({
    rank: Number(r.rank),
    userId: Number(r.user_id),
    username: String(r.username || ''),
    volume: Number(r.volume) || 0,
    trades: Number(r.trades) || 0
  }))
}

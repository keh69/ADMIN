import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { eventMenuLabel, kstWeekRange, weeklyVolumeRank } from '../../../utils/events'

// 이벤트 상세 + 순위(관리자 화면이라 아이디를 가리지 않는다)
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: '잘못된 이벤트 번호입니다.' })
  const { data, error } = await getSupabaseAdminClient().from('bitduck_events').select('*').eq('id', id).limit(1)
  if (error) throw error
  const row: any = (data || [])[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: '이벤트를 찾을 수 없습니다.' })
  const week = String(getQuery(event).week || '') === 'last' ? -1 : 0
  const { from, to } = kstWeekRange(week)
  const ranking = row.kind === 'weekly_volume' ? await weeklyVolumeRank(from, to, 100) : []
  return {
    event: {
      id: Number(row.id),
      site: String(row.site),
      code: String(row.code),
      name: String(row.name),
      kind: String(row.kind),
      title: String(row.title || ''),
      description: String(row.description || ''),
      nameEn: String(row.name_en || ''),
      titleEn: String(row.title_en || ''),
      descriptionEn: String(row.description_en || ''),
      prizes: Array.isArray(row.prizes) ? row.prizes : [],
      enabled: !!row.enabled,
      label: eventMenuLabel(row),
      updatedAt: String(row.updated_at || '')
    },
    period: { from: from.toISOString(), to: to.toISOString(), week: week === -1 ? 'last' : 'this' },
    ranking
  }
})

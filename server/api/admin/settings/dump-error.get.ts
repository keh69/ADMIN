import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'

// [임시 · 보여주기용] 거래소 차트 화면 덤프오류 설정 읽기
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const supa = getSupabaseAdminClient()
  const { data, error } = await supa
    .from('bitduck_system_settings')
    .select('dump_error_enabled, dump_error_min_sec, dump_error_max_sec')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return {
    enabled: !!(data as any)?.dump_error_enabled,
    minSec: Number((data as any)?.dump_error_min_sec ?? 5),
    maxSec: Number((data as any)?.dump_error_max_sec ?? 10)
  }
})

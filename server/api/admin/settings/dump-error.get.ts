import { requireSuperAdmin } from '../../../utils/auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'

// [임시 · 보여주기용] 차트 화면 덤프오류 설정 읽기 — 거래소(ktx)와 테스트(test) 따로
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const supa = getSupabaseAdminClient()
  const { data, error } = await supa
    .from('bitduck_system_settings')
    .select('dump_error_enabled, dump_error_min_sec, dump_error_max_sec, dump_error_test_enabled, dump_error_test_min_sec, dump_error_test_max_sec')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const d = (data || {}) as any
  return {
    ktx: { enabled: !!d.dump_error_enabled, minSec: Number(d.dump_error_min_sec ?? 5), maxSec: Number(d.dump_error_max_sec ?? 10) },
    test: { enabled: !!d.dump_error_test_enabled, minSec: Number(d.dump_error_test_min_sec ?? 5), maxSec: Number(d.dump_error_test_max_sec ?? 10) }
  }
})

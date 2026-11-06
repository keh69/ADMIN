import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'

const QuerySchema = z.object({
  userId: z.coerce.number().int().positive()
})

// 회원정보 수정 기록: 총관리자만 볼 수 있다(회원 본인/부관리자는 볼 수 없음).
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const query = QuerySchema.parse(getQuery(event))
  if (!supabaseAppDbEnabled()) return { items: [] }
  const supa = getSupabaseAdminClient()
  const { data, error } = await supa
    .from('bitduck_user_profile_history')
    .select('id, actor_username, actor_role, source, changes, ip, created_at')
    .eq('user_id', query.userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return {
    items: (data || []).map((r: any) => ({
      id: Number(r.id),
      actorUsername: String(r.actor_username || ''),
      actorRole: String(r.actor_role || ''),
      source: String(r.source || ''),
      changes: Array.isArray(r.changes) ? r.changes : [],
      ip: String(r.ip || ''),
      createdAt: String(r.created_at || '')
    }))
  }
})

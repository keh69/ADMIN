import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'
import { getSupabaseAdminClient } from './supabase'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getDb } from './db'

// 비밀번호를 이 횟수만큼 연속으로 틀리면 접속이 제한된다(관리자가 비밀번호를 초기화하면 풀린다).
export const LOGIN_MAX_FAILS = 5
export const LOGIN_LOCKED_MESSAGE = '비밀번호를 5회 잘못 입력하여 접속이 제한되었습니다. 고객센터로 문의해 주세요.'

function escapeLike(v: string) {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`)
}

// 아이디는 대소문자를 구분하지 않는다(KLklkl로 가입해도 klklkl로 로그인 가능). 정확히 같은 아이디를 먼저 찾고, 없으면 대소문자 무시로 찾는다.
export async function findUserByUsername<T = any>(username: string, opts?: { columns?: string; role?: string }): Promise<T | null> {
  const uname = String(username || '').trim()
  if (!uname) return null
  const columns = opts?.columns || '*'
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    let q1: any = supa.from('bitduck_users').select(columns).eq('username', uname)
    if (opts?.role) q1 = q1.eq('role', opts.role)
    const { data: exact } = await q1.limit(1)
    if ((exact || [])[0]) return (exact as any)[0]
    let q2: any = supa.from('bitduck_users').select(columns).ilike('username', escapeLike(uname))
    if (opts?.role) q2 = q2.eq('role', opts.role)
    const { data: ci } = await q2.limit(1)
    return ((ci || [])[0] as T) || null
  }
  const db = getDb()
  const roleSql = opts?.role ? ' AND role = ?' : ''
  const args: any[] = opts?.role ? [uname, opts.role] : [uname]
  const exact = db.prepare(`SELECT * FROM users WHERE username = ?${roleSql} LIMIT 1`).get(...args)
  if (exact) return exact as T
  return (db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE${roleSql} LIMIT 1`).get(...args) as T) || null
}

// 같은 아이디(대소문자 무시)를 이미 다른 회원이 쓰고 있는지
export async function usernameTaken(username: string, exceptUserId?: number): Promise<boolean> {
  const u = await findUserByUsername<any>(username, { columns: 'id' })
  if (!u) return false
  return exceptUserId == null || Number(u.id) !== Number(exceptUserId)
}

export function isLoginLocked(user: any) {
  return Boolean(user?.login_locked_at)
}

// 비밀번호 틀림 1회 기록. 5회째면 접속제한. 반환: 지금까지 틀린 횟수, 잠겼는지
export async function recordLoginFailure(event: H3Event, user: any): Promise<{ count: number; locked: boolean }> {
  // 총관리자 계정은 잠기면 풀어줄 사람이 없으므로 잠그지 않는다.
  if (String(user?.role || '') === 'super_admin') return { count: 0, locked: false }
  const count = Number(user?.login_fail_count || 0) + 1
  const locked = count >= LOGIN_MAX_FAILS
  const now = new Date().toISOString()
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    await supa
      .from('bitduck_users')
      .update(locked ? { login_fail_count: count, login_locked_at: now } : { login_fail_count: count })
      .eq('id', Number(user.id))
  } else {
    getDb()
      .prepare('UPDATE users SET login_fail_count = ?, login_locked_at = COALESCE(login_locked_at, ?) WHERE id = ?')
      .run(count, locked ? now : null, Number(user.id))
  }
  if (locked) {
    await recordProfileHistory(event, {
      userId: Number(user.id),
      username: String(user.username || ''),
      actor: null,
      source: 'system',
      changes: [{ field: 'login_lock', label: '접속제한', before: '', after: '비밀번호 5회 오류로 접속제한' }]
    })
  }
  return { count, locked }
}

export async function clearLoginFailures(user: any) {
  if (!Number(user?.login_fail_count || 0) && !user?.login_locked_at) return
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    await supa.from('bitduck_users').update({ login_fail_count: 0, login_locked_at: null }).eq('id', Number(user.id))
  } else {
    getDb().prepare('UPDATE users SET login_fail_count = 0, login_locked_at = NULL WHERE id = ?').run(Number(user.id))
  }
}

// ---- 회원정보 수정 기록(총관리자만 ADMIN에서 볼 수 있음) ----

export const PROFILE_FIELDS: Array<{ field: string; label: string }> = [
  { field: 'username', label: '아이디' },
  { field: 'name', label: '이름' },
  { field: 'birth_date', label: '생년월일' },
  { field: 'bank_name', label: '은행명' },
  { field: 'bank_account', label: '계좌번호' },
  { field: 'account_holder', label: '예금주' },
  { field: 'referral_code', label: '추천코드' }
]

// 수정 전 값을 캐시 없이 DB에서 바로 읽는다(로그인 확인 캐시는 20초 동안 옛 값일 수 있음).
export async function loadProfileRow(userId: number): Promise<any | null> {
  const cols = 'id, ' + PROFILE_FIELDS.map((f) => f.field).join(', ')
  if (supabaseAppDbEnabled()) {
    const { data } = await getSupabaseAdminClient().from('bitduck_users').select(cols).eq('id', Number(userId)).limit(1)
    return (data || [])[0] || null
  }
  return (getDb().prepare(`SELECT ${cols} FROM users WHERE id = ?`).get(Number(userId)) as any) || null
}

export type ProfileChange ={ field: string; label: string; before: string; after: string }

export function diffProfile(before: any, after: any): ProfileChange[] {
  const out: ProfileChange[] = []
  for (const f of PROFILE_FIELDS) {
    if (!(f.field in (after || {}))) continue
    const b = String(before?.[f.field] ?? '').trim()
    const a = String(after?.[f.field] ?? '').trim()
    if (b !== a) out.push({ field: f.field, label: f.label, before: b, after: a })
  }
  return out
}

export async function recordProfileHistory(
  event: H3Event,
  payload: {
    userId: number
    username: string
    actor: { id: number; username: string; role: string } | null
    source: 'member_profile' | 'member_wallet' | 'admin' | 'system'
    changes: ProfileChange[]
  }
) {
  if (!payload.changes.length || !supabaseAppDbEnabled()) return
  try {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from('bitduck_user_profile_history').insert({
      user_id: payload.userId,
      username: payload.username,
      actor_id: payload.actor ? Number(payload.actor.id) : null,
      actor_username: payload.actor?.username || '',
      actor_role: payload.actor?.role || '',
      source: payload.source,
      changes: payload.changes,
      ip: getRequestIP(event, { xForwardedFor: true }) || null
    })
    if (error) console.warn('[profile-history]', error.message)
  } catch (e: any) {
    console.warn('[profile-history]', e?.message || e)
  }
}

import { z } from 'zod'
import { getDb } from '../../utils/db'
import { createSession, verifyPassword } from '../../utils/auth'
import { logLogin } from '../../utils/supa-log'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { LOGIN_LOCKED_MESSAGE, LOGIN_MAX_FAILS, clearLoginFailures, findUserByUsername, isLoginLocked, recordLoginFailure } from '../../utils/account-security'

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    // 아이디는 대소문자 구분 없이 찾는다(비밀번호는 구분).
    const user = await findUserByUsername<any>(body.username.trim())
    if (!user) {
      await logLogin(event, { userId: null, username: body.username, area: 'admin', success: false })
      throw createError({ statusCode: 404, statusMessage: '아이디가 존재하지 않습니다.' })
    }
    // 비밀번호 5회 연속 오류로 잠긴 계정은 총관리자가 비밀번호를 초기화해야 풀린다.
    if (isLoginLocked(user)) {
      await logLogin(event, { userId: Number(user.id), username: body.username, area: 'admin', success: false })
      throw createError({ statusCode: 423, statusMessage: LOGIN_LOCKED_MESSAGE })
    }
    if (!verifyPassword(body.password, String(user.password_hash))) {
      await logLogin(event, { userId: Number(user.id), username: body.username, area: 'admin', success: false })
      const { count, locked } = await recordLoginFailure(event, user)
      if (locked) throw createError({ statusCode: 423, statusMessage: LOGIN_LOCKED_MESSAGE })
      const suffix = count > 0 ? ` (${count}/${LOGIN_MAX_FAILS}회, ${LOGIN_MAX_FAILS}회 틀리면 접속이 제한됩니다)` : ''
      throw createError({ statusCode: 401, statusMessage: `비밀번호가 올바르지 않습니다.${suffix}` })
    }
    if (user.role === 'user') {
      await logLogin(event, { userId: Number(user.id), username: body.username, area: 'admin', success: false })
      throw createError({ statusCode: 403, statusMessage: '관리자 계정이 아닙니다.' })
    }

    await clearLoginFailures(user)
    await createSession(event, Number(user.id))
    await logLogin(event, { userId: Number(user.id), username: body.username, area: 'admin', success: true })
    return { ok: true }
  }

  const db = getDb()

  const user = db
    .prepare('SELECT id, password_hash, role FROM users WHERE username = ?')
    .get(body.username) as { id: number; password_hash: string; role: string } | undefined

  if (!user) {
    await logLogin(event, { userId: null, username: body.username, area: 'admin', success: false })
    throw createError({ statusCode: 404, statusMessage: '아이디가 존재하지 않습니다.' })
  }
  if (!verifyPassword(body.password, user.password_hash)) {
    await logLogin(event, { userId: user.id, username: body.username, area: 'admin', success: false })
    throw createError({ statusCode: 401, statusMessage: '비밀번호가 올바르지 않습니다.' })
  }
  if (user.role === 'user') {
    await logLogin(event, { userId: user.id, username: body.username, area: 'admin', success: false })
    throw createError({ statusCode: 403, statusMessage: '관리자 계정이 아닙니다.' })
  }

  await createSession(event, user.id)
  await logLogin(event, { userId: user.id, username: body.username, area: 'admin', success: true })
  return { ok: true }
})

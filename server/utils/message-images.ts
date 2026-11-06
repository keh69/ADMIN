import { createError } from 'h3'
import { getSupabaseAdminClient } from './supabase'
import { supabaseAppDbEnabled } from './supa-appdb'

// 고객센터(회원 쪽지)에 첨부한 이미지.
// - 그림 파일은 Supabase Storage의 비공개 버킷(message-images)에 저장하고, 쪽지 본문에는 [[img:경로]] 표시만 넣는다.
// - 경로는 "t<대화 회원번호>/<시각>-<무작위>.<확장자>" 형태라서, 그 대화를 볼 수 있는 사람만 /api/messages/image 로 받아 볼 수 있다.
// - 비회원 실시간 대화(guest chat)에는 쓰지 않는다.
// (ADMIN / KTX 두 곳에 같은 파일로 둔다)
export const MESSAGE_IMAGE_BUCKET = 'message-images'
export const MESSAGE_IMAGE_MAX_COUNT = 4
export const MESSAGE_IMAGE_MAX_BYTES = 2_500_000
export const MESSAGE_IMAGE_TOKEN_RE = /\[\[img:(t\d+\/[a-z0-9-]+\.(?:jpg|png|webp))\]\]/g
const PATH_RE = /^t(\d+)\/[a-z0-9-]+\.(jpg|png|webp)$/

const MIME_BY_EXT: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

// 회원이 본문에 직접 [[img:…]]를 적어 다른 사람 그림을 끌어오지 못하게, 입력한 글에서는 표시를 지운다.
export function stripImageTokens(text: string) {
  return String(text || '').replace(MESSAGE_IMAGE_TOKEN_RE, '')
}

// 목록 미리보기/텔레그램 알림 등 글자만 보여주는 곳에서는 그림 표시를 [이미지]로 바꾼다.
export function messageBodyPreview(body: string) {
  return String(body || '')
    .replace(MESSAGE_IMAGE_TOKEN_RE, '[이미지]')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export function parseMessageImagePath(path: string) {
  const m = PATH_RE.exec(String(path || ''))
  if (!m) return null
  return { ownerUserId: Number(m[1]), ext: m[2] as 'jpg' | 'png' | 'webp' }
}

function decodeImageDataUrl(dataUrl: string) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
  if (!m) throw createError({ statusCode: 400, statusMessage: '이미지 형식이 올바르지 않습니다.' })
  const buf = Buffer.from(m[2], 'base64')
  if (!buf.length || buf.length > MESSAGE_IMAGE_MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: '이미지 용량이 너무 큽니다.' })
  }
  // 실제 파일 내용도 확인(확장자만 바꾼 파일 차단)
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  const isWebp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP'
  const ext = isJpg ? 'jpg' : isPng ? 'png' : isWebp ? 'webp' : ''
  if (!ext) throw createError({ statusCode: 400, statusMessage: '이미지 파일만 보낼 수 있습니다.' })
  return { buf, ext }
}

function randomPart() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

// 이미지들을 저장하고 본문에 넣을 [[img:…]] 표시 목록을 돌려준다.
export async function uploadMessageImages(threadUserId: number, dataUrls: string[]): Promise<string[]> {
  const list = (dataUrls || []).filter(Boolean)
  if (!list.length) return []
  if (list.length > MESSAGE_IMAGE_MAX_COUNT) {
    throw createError({ statusCode: 400, statusMessage: `이미지는 한 번에 ${MESSAGE_IMAGE_MAX_COUNT}장까지 보낼 수 있습니다.` })
  }
  if (!supabaseAppDbEnabled()) {
    throw createError({ statusCode: 400, statusMessage: '이 환경에서는 이미지를 보낼 수 없습니다.' })
  }
  const files = list.map(decodeImageDataUrl)
  const supa = getSupabaseAdminClient()
  const tokens: string[] = []
  let bucketChecked = false
  for (const f of files) {
    const path = `t${Number(threadUserId)}/${Date.now()}-${randomPart()}.${f.ext}`
    const upload = () =>
      supa.storage.from(MESSAGE_IMAGE_BUCKET).upload(path, f.buf, { contentType: MIME_BY_EXT[f.ext], upsert: false, cacheControl: '31536000' })
    let { error } = await upload()
    // 버킷이 아직 없으면(처음 한 번) 비공개 버킷을 만들고 다시 올린다.
    if (error && !bucketChecked && /not.?found|does not exist/i.test(String(error.message || ''))) {
      bucketChecked = true
      await supa.storage.createBucket(MESSAGE_IMAGE_BUCKET, { public: false }).catch(() => null)
      ;({ error } = await upload())
    }
    if (error) {
      console.error('[message-images] upload failed:', error.message || error)
      throw createError({ statusCode: 500, statusMessage: '이미지 저장에 실패했습니다.' })
    }
    tokens.push(`[[img:${path}]]`)
  }
  return tokens
}

export async function downloadMessageImage(path: string) {
  const info = parseMessageImagePath(path)
  if (!info || !supabaseAppDbEnabled()) return null
  const supa = getSupabaseAdminClient()
  const { data, error } = await supa.storage.from(MESSAGE_IMAGE_BUCKET).download(path)
  if (error || !data) return null
  return { buf: Buffer.from(await data.arrayBuffer()), mime: MIME_BY_EXT[info.ext], ownerUserId: info.ownerUserId }
}

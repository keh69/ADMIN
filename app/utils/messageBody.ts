// 고객센터 쪽지 본문에 들어간 첨부 이미지 표시([[img:경로]])를 화면용으로 나누고,
// 붙여넣기/첨부한 그림 파일을 보내기 좋은 크기로 줄인다. (ADMIN / KTX 같은 파일)
export type MessagePart = { type: 'text'; text: string } | { type: 'img'; src: string }

const TOKEN_RE = /\[\[img:(t\d+\/[a-z0-9-]+\.(?:jpg|png|webp))\]\]/g

export const MESSAGE_ATTACH_MAX = 4

export function messageImageUrl(path: string) {
  return `/api/messages/image?p=${encodeURIComponent(path)}`
}

export function splitMessageBody(body: string): MessagePart[] {
  const s = String(body || '')
  const parts: MessagePart[] = []
  let last = 0
  for (const m of s.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0
    const text = s.slice(last, idx).replace(/^\n+|\n+$/g, '')
    if (text) parts.push({ type: 'text', text })
    parts.push({ type: 'img', src: messageImageUrl(m[1]) })
    last = idx + m[0].length
  }
  const rest = s.slice(last).replace(/^\n+|\n+$/g, '')
  if (rest) parts.push({ type: 'text', text: rest })
  return parts
}

// 대화 목록 미리보기 등 글자만 보이는 곳: 그림은 [이미지]로
export function messagePreviewText(body: string, imageLabel = '[이미지]') {
  return String(body || '')
    .replace(TOKEN_RE, imageLabel)
    .replace(/\n{2,}/g, '\n')
    .trim()
}

// 붙여넣기(Ctrl+V)한 클립보드에서 그림 파일만 꺼낸다.
export function imageFilesFromClipboard(e: ClipboardEvent): File[] {
  const items = Array.from(e.clipboardData?.items || [])
  return items
    .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
    .map((it) => it.getAsFile())
    .filter((f): f is File => Boolean(f))
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}

// bmp/jpg/png/gif/webp 등 어떤 그림이든 JPEG로 바꾸고 긴 변 1600px, 약 600KB 이하로 줄인다(전송량·저장공간 절약).
export async function imageFileToDataUrl(file: File): Promise<string> {
  const img = await loadImage(file)
  const MAX_BYTES = 600_000
  let maxSide = 1600
  let quality = 0.85
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
    const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale))
    const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unavailable')
    // 투명 배경(PNG)은 흰색으로 채운다(JPEG는 투명을 못 담아 검게 나오는 것 방지)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const bytes = Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)
    if (bytes <= MAX_BYTES) return dataUrl
    if (quality > 0.6) quality -= 0.1
    else maxSide = Math.round(maxSide * 0.8)
  }
  throw new Error('image too large')
}

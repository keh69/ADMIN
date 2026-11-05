<template>
  <div class="cbk-fit" :style="{ width: cb.cardW * scale + 'px', height: cb.cardH * scale + 'px' }">
    <div class="cbk-scale" :style="{ width: cb.cardW + 'px', height: cb.cardH + 'px', transform: 'scale(' + scale + ')' }">
      <div class="cbk-card" :class="{ 'cbk-editable': editable }" :style="cardStyle" @click="emit('select', 'card')">
        <div class="cbk-dim" :style="{ backgroundColor: cb.dimColor, opacity: cb.dim / 100 }" />
        <div class="cbk-tint" :style="{ backgroundColor: cb.tintColor, opacity: cb.tint / 100 }" />
        <!-- 카드 위에 올린 PNG 그림: 편집 화면에서는 끌어서 이동, 점선 박스의 점으로 크기 조절 -->
        <div
          v-for="st in stickers"
          :key="st.id"
          class="cbk-sticker"
          :class="{ 'cbk-sticker-edit': editable, 'cbk-sticker-on': editable && selectedSticker === st.id }"
          :style="{ left: st.x + 'px', top: st.y + 'px', width: st.w + 'px', height: st.h + 'px' }"
          @pointerdown.stop="onStickerDown($event, st, 'move')"
          @click.stop
        >
          <img :src="st.src" alt="" draggable="false" class="cbk-sticker-img" />
          <template v-if="editable && selectedSticker === st.id">
            <span v-for="h in STICKER_HANDLES" :key="h" class="cbk-h" :class="'cbk-h-' + h" @pointerdown.stop="onStickerDown($event, st, h)" />
          </template>
        </div>
        <!-- 글자 줄마다 "기본 글자 기준 고정 칸(cbk-fix)"을 두고 실제 글자(cbk-real)는 그 위에 띄워 그린다.
             그래서 글자를 지우거나 크기/내용을 바꿔도 다른 글자들의 위치는 변하지 않는다. -->
        <div class="cbk-content">
          <div class="cbk-header">
            <div class="cbk-fix">
              <div class="cbk-title cbk-ghost" aria-hidden="true">ktxexchange</div>
            <div class="cbk-title cbk-real" :class="pickClass()" :style="itemStyle('title', { outline: outlineFor('title'), outlineOffset: '3px' })" @click.stop="pick('title')" @dblclick.stop="startEdit('title')">
              <input v-if="editing === 'title'" :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" />
              <template v-else>{{ cb.texts.title }}</template>
            </div>
            </div>
          </div>
          <div class="cbk-values">
            <div class="cbk-fix">
              <div class="cbk-pct cbk-ghost" aria-hidden="true"><span>0.00</span><span>%</span></div>
            <div class="cbk-pct cbk-real" :style="{ color: accent }">
              <span :class="pickClass()" :style="itemStyle('percent', { outline: outlineFor('percent'), outlineOffset: '3px' })" @click.stop="pick('percent')">{{ percentText }}</span>
              <span :class="pickClass()" :style="itemStyle('percentSign', { outline: outlineFor('percentSign'), outlineOffset: '3px' })" @click.stop="pick('percentSign')" @dblclick.stop="startEdit('percentSign')">
                <input v-if="editing === 'percentSign'" :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" />
                <template v-else>{{ cb.texts.sign }}</template>
              </span>
            </div>
            </div>
            <div class="cbk-fix">
              <div class="cbk-amt cbk-ghost" aria-hidden="true">0 원</div>
            <div class="cbk-amt cbk-real" :class="pickClass()" :style="itemStyle('profit', { outline: outlineFor('profit'), outlineOffset: '3px' })" @click.stop="pick('profit')" @dblclick.stop="startEdit('profit')">
              <template v-if="editing === 'profit'">{{ wonNumberText }} <input :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" /></template>
              <template v-else>{{ wonLine }}</template>
            </div>
            </div>
          </div>
          <div class="cbk-divider" :class="pickClass()" :style="dividerStyle" @click.stop="pick('divider')" />
          <div class="cbk-sep" />
          <div class="cbk-grid">
            <div class="cbk-item">
              <div class="cbk-fix">
                <div class="cbk-label cbk-ghost" aria-hidden="true">코인</div>
              <label class="cbk-label cbk-real" :class="pickClass()" :style="itemStyle('lblCoin', { outline: outlineFor('lblCoin'), outlineOffset: '2px' })" @click.stop="pick('lblCoin')" @dblclick.stop="startEdit('lblCoin')">
                <input v-if="editing === 'lblCoin'" :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" />
                <template v-else>{{ cb.texts.coin }}</template>
              </label>
              </div>
              <div class="cbk-fix">
                <div class="cbk-valwrap cbk-ghost" aria-hidden="true"><span>BTCUSDT</span><span class="cbk-side" style="font-size: 19px"><span class="cbk-side-text">롱</span></span></div>
              <div class="cbk-valwrap cbk-real">
                <span :class="pickClass()" :style="itemStyle('symbol', { outline: outlineFor('symbol'), outlineOffset: '2px' })" @click.stop="pick('symbol')">{{ symbol }}</span>
                <span class="cbk-side" :class="[side === 'short' ? 'cbk-short' : 'cbk-long', pickClass()]" :style="itemStyle('side', { color: it('side').color || (side === 'short' ? '#EF4444' : '#22C55E'), opacity: undefined })" @click.stop="pick('side')" @dblclick.stop="startEdit('side')">
                  <span class="cbk-side-box" :class="pickClass()" :style="sideBoxStyle" @click.stop="pick('sideBox')" />
                  <span class="cbk-side-text">
                    <input v-if="editing === 'side'" :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" />
                    <template v-else>{{ side === 'short' ? cb.texts.short : cb.texts.long }}</template>
                  </span>
                </span>
              </div>
              </div>
            </div>
            <div class="cbk-item">
              <div class="cbk-fix">
                <div class="cbk-label cbk-ghost" aria-hidden="true">코인</div>
              <label class="cbk-label cbk-real" :class="pickClass()" :style="itemStyle('lblLev', { outline: outlineFor('lblLev'), outlineOffset: '2px' })" @click.stop="pick('lblLev')" @dblclick.stop="startEdit('lblLev')">
                <input v-if="editing === 'lblLev'" :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" />
                <template v-else>{{ cb.texts.lev }}</template>
              </label>
              </div>
              <div class="cbk-fix">
                <div class="cbk-val cbk-ghost" aria-hidden="true">0</div>
              <span class="cbk-val cbk-real" :class="pickClass()" :style="itemStyle('lev', { outline: outlineFor('lev'), outlineOffset: '2px' })" @click.stop="pick('lev')" @dblclick.stop="startEdit('lev')">
                <template v-if="editing === 'lev'"><input :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" /> x{{ levNumber }}</template>
                <template v-else>{{ levLine }}</template>
              </span>
              </div>
            </div>
            <div class="cbk-item">
              <div class="cbk-fix">
                <div class="cbk-label cbk-ghost" aria-hidden="true">코인</div>
              <label class="cbk-label cbk-real" :class="pickClass()" :style="itemStyle('lblEntry', { outline: outlineFor('lblEntry'), outlineOffset: '2px' })" @click.stop="pick('lblEntry')" @dblclick.stop="startEdit('lblEntry')">
                <input v-if="editing === 'lblEntry'" :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" />
                <template v-else>{{ cb.texts.entry }}</template>
              </label>
              </div>
              <div class="cbk-fix">
                <div class="cbk-val cbk-ghost" aria-hidden="true">0</div>
              <span class="cbk-val cbk-real" :class="pickClass()" :style="itemStyle('entry', { outline: outlineFor('entry'), outlineOffset: '2px' })" @click.stop="pick('entry')" @dblclick.stop="startEdit('entry')">
                <template v-if="editing === 'entry'">{{ entryText }} <input :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" /></template>
                <template v-else>{{ entryLine }}</template>
              </span>
              </div>
            </div>
            <div class="cbk-item">
              <div class="cbk-fix">
                <div class="cbk-label cbk-ghost" aria-hidden="true">코인</div>
              <label class="cbk-label cbk-real" :class="pickClass()" :style="itemStyle('lblExit', { outline: outlineFor('lblExit'), outlineOffset: '2px' })" @click.stop="pick('lblExit')" @dblclick.stop="startEdit('lblExit')">
                <input v-if="editing === 'lblExit'" :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" />
                <template v-else>{{ cb.texts.exit }}</template>
              </label>
              </div>
              <div class="cbk-fix">
                <div class="cbk-val cbk-ghost" aria-hidden="true">0</div>
              <span class="cbk-val cbk-real" :class="pickClass()" :style="itemStyle('exit', { outline: outlineFor('exit'), outlineOffset: '2px' })" @click.stop="pick('exit')" @dblclick.stop="startEdit('exit')">
                <template v-if="editing === 'exit'">{{ exitText }} <input :ref="setEditRef" v-model="editValue" class="cbk-edit" :size="editSize" @click.stop @dblclick.stop @keydown.enter.prevent="commitEdit" @keydown.esc.prevent="cancelEdit" @blur="commitEdit" /></template>
                <template v-else>{{ exitLine }}</template>
              </span>
              </div>
            </div>
          </div>
        </div>
        <button type="button" class="cbk-close" :class="pickClass()" :style="closeStyle" @click.stop="onCloseClick">
          <svg xmlns="http://www.w3.org/2000/svg" class="cbk-close-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CB_DEFAULT_BG, cbTextKeyFor, hexToRgbTriplet, type CbConfig, type CbItemKey, type CbSticker, type CbTextKey } from '~/utils/cardBreaker'

// 수익카드(청산카드) 코인브레이커 레이아웃. 거래소(KTX) 수익카드와 어드민 "카드 디자인" 미리보기가 이 컴포넌트 하나로 그려서 항상 같은 모양이 된다.
// 카드 안의 글자(제목/라벨/롱·숏/단위)는 설정(cb.texts)의 글자가 거래소 언어와 상관없이 그대로 나온다.
const props = withDefaults(
  defineProps<{
    cb: CbConfig
    roe: number
    pnl: number
    wonNumber: string
    side: 'long' | 'short'
    symbol: string
    leverage: number | string
    // 진입/종료 가격 숫자 글자(소수점 5자리 등). 단위(USDT)는 cb.texts.usdt가 뒤에 붙는다.
    entryText: string
    exitText: string
    positiveColor?: string
    negativeColor?: string
    bgImage?: string
    editable?: boolean
    selected?: string | null
    selectedSticker?: string | null
    fit?: boolean
  }>(),
  {
    positiveColor: '#22C55E',
    negativeColor: '#EF4444',
    bgImage: '',
    editable: false,
    selected: null,
    selectedSticker: null,
    fit: false
  }
)
const emit = defineEmits<{
  (e: 'select', key: CbItemKey | 'card'): void
  (e: 'close'): void
  (e: 'edit', key: CbTextKey, value: string): void
  (e: 'sticker-select', id: string): void
  (e: 'sticker-change', id: string, patch: { x: number; y: number; w: number; h: number }): void
}>()

// ───────── PNG 그림(스티커) 이동/크기 조절 ─────────
// 가운데를 끌면 이동, 모서리 점은 비율 유지(Shift를 누르면 자유롭게), 변의 점은 가로 또는 세로만 조절.
const STICKER_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type StickerMode = 'move' | (typeof STICKER_HANDLES)[number]
const stickers = computed<CbSticker[]>(() => (Array.isArray(props.cb.stickers) ? props.cb.stickers : []))
let drag: { id: string; mode: StickerMode; sx: number; sy: number; x: number; y: number; w: number; h: number } | null = null
function onStickerDown(e: PointerEvent, st: CbSticker, mode: StickerMode) {
  if (!props.editable || e.button !== 0) return
  e.preventDefault()
  emit('sticker-select', st.id)
  drag = { id: st.id, mode, sx: e.clientX, sy: e.clientY, x: st.x, y: st.y, w: st.w, h: st.h }
  window.addEventListener('pointermove', onStickerMove)
  window.addEventListener('pointerup', onStickerUp)
  window.addEventListener('pointercancel', onStickerUp)
}
function onStickerMove(e: PointerEvent) {
  const d = drag
  if (!d) return
  const k = scale.value || 1
  const dx = (e.clientX - d.sx) / k
  const dy = (e.clientY - d.sy) / k
  let { x, y, w, h } = d
  if (d.mode === 'move') {
    x += dx
    y += dy
  } else {
    const m = d.mode
    let nw = w
    let nh = h
    if (m.includes('e')) nw = w + dx
    if (m.includes('w')) nw = w - dx
    if (m.includes('s')) nh = h + dy
    if (m.includes('n')) nh = h - dy
    if (m.length === 2 && !e.shiftKey) {
      const ratio = w / h
      if (Math.abs(nw / w - 1) >= Math.abs(nh / h - 1)) nh = nw / ratio
      else nw = nh * ratio
    }
    nw = Math.max(8, nw)
    nh = Math.max(8, nh)
    if (m.includes('w')) x = d.x + (w - nw)
    if (m.includes('n')) y = d.y + (h - nh)
    w = nw
    h = nh
  }
  emit('sticker-change', d.id, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })
}
function onStickerUp() {
  drag = null
  window.removeEventListener('pointermove', onStickerMove)
  window.removeEventListener('pointerup', onStickerUp)
  window.removeEventListener('pointercancel', onStickerUp)
}
onBeforeUnmount(onStickerUp)

const scale = ref(1)
function updateScale() {
  if (!props.fit || typeof window === 'undefined') {
    scale.value = 1
    return
  }
  scale.value = Math.min(1, Math.max(0.4, (window.innerWidth - 32) / props.cb.cardW))
}
onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateScale))
watch(() => [props.fit, props.cb.cardW], updateScale)

const accent = computed(() => (props.pnl >= 0 ? props.positiveColor : props.negativeColor))
const percentText = computed(() => `${props.roe < 0 ? '-' : ''}${Math.abs(props.roe).toFixed(2)}`)
const wonNumberText = computed(() => `${props.pnl < 0 ? '-' : ''}${props.wonNumber}`)
const levNumber = computed(() => String(props.leverage).replace(/^x/i, ''))
const wonLine = computed(() => wonNumberText.value + (props.cb.texts.won ? ' ' + props.cb.texts.won : ''))
const levLine = computed(() => (props.cb.texts.isolated ? props.cb.texts.isolated + ' ' : '') + 'x' + levNumber.value)
const entryLine = computed(() => props.entryText + (props.cb.texts.usdt ? ' ' + props.cb.texts.usdt : ''))
const exitLine = computed(() => props.exitText + (props.cb.texts.usdt ? ' ' + props.cb.texts.usdt : ''))

// 더블클릭 글자 수정
const editing = ref<CbItemKey | null>(null)
const editValue = ref('')
let editEl: HTMLInputElement | null = null
const editSize = computed(() => Math.max(2, editValue.value.length + 1))
function setEditRef(el: any) {
  editEl = (el as HTMLInputElement | null) || null
}
function startEdit(key: CbItemKey) {
  if (!props.editable) return
  const tk = cbTextKeyFor(key, props.side)
  if (!tk) return
  emit('select', key)
  editing.value = key
  editValue.value = props.cb.texts[tk]
  nextTick(() => {
    editEl?.focus()
    editEl?.select()
  })
}
function commitEdit() {
  const key = editing.value
  if (!key) return
  editing.value = null
  const tk = cbTextKeyFor(key, props.side)
  if (tk) emit('edit', tk, editValue.value)
}
function cancelEdit() {
  editing.value = null
}

const bgUrl = computed(() => (props.cb.useDefaultBg ? CB_DEFAULT_BG : props.bgImage || ''))
const cardStyle = computed(() => ({
  width: props.cb.cardW + 'px',
  height: props.cb.cardH + 'px',
  padding: props.cb.pad + 'px',
  borderRadius: props.cb.radius + 'px',
  backgroundColor: '#0b0f17',
  backgroundImage: bgUrl.value ? `url("${bgUrl.value}")` : 'none',
  backgroundRepeat: 'no-repeat',
  backgroundSize: `${Math.max(100, props.cb.bgZoom * 100).toFixed(3)}% auto`,
  backgroundPosition: `calc(50% + ${Math.round(props.cb.bgShiftX)}px) calc(50% + ${Math.round(props.cb.bgShiftY)}px)`,
  outline: props.editable && props.selected === 'card' ? '2px solid #818cf8' : undefined,
  outlineOffset: '2px'
}))

function it(key: CbItemKey) {
  return props.cb.items[key]
}
function outlineFor(key: CbItemKey) {
  return props.editable && props.selected === key ? '2px solid #818cf8' : undefined
}
function pickClass() {
  return props.editable ? 'cbk-pick' : ''
}
function pick(key: CbItemKey) {
  if (props.editable) emit('select', key)
}
function itemStyle(key: CbItemKey, extra: Record<string, any> = {}) {
  const s = it(key)
  const st: Record<string, any> = { transform: `translate(${s.x || 0}px, ${s.y || 0}px)` }
  if (s.size) st.fontSize = s.size + 'px'
  if (s.weight) st.fontWeight = s.weight
  if (s.color) st.color = s.color
  if (s.font && s.font !== 'inherit') st.fontFamily = s.font
  if (s.tracking != null) st.letterSpacing = s.tracking + 'px'
  if (s.opacity != null) st.opacity = s.opacity
  for (const k of Object.keys(extra)) {
    if (extra[k] === undefined) delete st[k]
    else st[k] = extra[k]
  }
  return st
}

const dividerStyle = computed(() => {
  const s = it('divider')
  return {
    width: Math.max(40, Math.round(Number(s.size) || 300)) + 'px',
    height: Math.max(1, Math.round(Number(s.weight) || 4)) + 'px',
    opacity: s.opacity != null ? s.opacity : 1,
    '--cbk-rgb': hexToRgbTriplet(s.color, '56, 189, 248'),
    transform: `translate(${s.x || 0}px, ${s.y || 0}px)`,
    outline: outlineFor('divider'),
    outlineOffset: '3px'
  } as Record<string, any>
})

const sideBoxStyle = computed(() => {
  const s = it('sideBox')
  const rgb = hexToRgbTriplet(s.color, '250, 204, 21')
  const alpha = s.opacity != null ? s.opacity : 1
  return {
    width: Math.max(18, Math.round(Number(s.size) || 34)) + 'px',
    height: Math.max(18, Math.round(Number(s.height) || 46)) + 'px',
    borderWidth: Math.max(0, Math.round(Number(s.weight) || 2)) + 'px',
    borderStyle: 'solid',
    borderColor: `rgba(${rgb}, ${alpha})`,
    boxShadow: `0 0 0 1px rgba(${rgb}, ${alpha * 0.35})`,
    transform: `translate(calc(-50% + ${s.x || 0}px), calc(-50% + ${s.y || 0}px))`,
    pointerEvents: props.editable ? 'auto' : 'none',
    outline: outlineFor('sideBox'),
    outlineOffset: '2px'
  } as Record<string, any>
})

const closePx = computed(() => Math.max(18, Math.min(80, Math.round(Number(it('close').size) || 24))))
const closeStyle = computed(() => ({
  transform: `translate(${it('close').x || 0}px, ${it('close').y || 0}px)`,
  width: closePx.value + 'px',
  height: closePx.value + 'px',
  outline: outlineFor('close'),
  outlineOffset: '2px'
}))
function onCloseClick() {
  if (props.editable) emit('select', 'close')
  else emit('close')
}
</script>

<style scoped>
.cbk-fit {
  position: relative;
  max-width: 100%;
}
.cbk-scale {
  transform-origin: top left;
}
.cbk-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  line-height: normal;
  font-family: 'Pretendard Variable', Pretendard, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
}
.cbk-card * {
  box-sizing: border-box;
}
.cbk-dim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.cbk-tint {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.cbk-content {
  position: relative;
  z-index: 10;
  /* 빈 곳 클릭은 아래의 PNG 그림/카드로 통과시키고, 글자(편집 가능한 항목)만 클릭을 받는다 */
  pointer-events: none;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.cbk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.cbk-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: -0.025em;
}
.cbk-values {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 8px;
  margin-bottom: 0;
}
.cbk-pct {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  display: flex;
  align-items: baseline;
  gap: 4px;
  letter-spacing: -0.025em;
  color: #22c55e;
}
.cbk-amt {
  font-size: 20px;
  font-weight: 500;
  color: #9ca3af;
}
.cbk-divider {
  display: block;
  position: relative;
  z-index: 12;
  flex: 0 0 auto;
  min-width: 160px;
  margin: 10px auto 6px;
  border-radius: 2px;
  background: rgba(var(--cbk-rgb, 56, 189, 248), 1);
  border: 1px solid rgba(var(--cbk-rgb, 56, 189, 248), 0.95);
  box-shadow: 0 0 10px rgba(var(--cbk-rgb, 56, 189, 248), 0.45);
}
.cbk-sep {
  height: 1px;
  width: 100%;
  background-color: #374151;
  margin-top: 16px;
  margin-bottom: 12px;
}
.cbk-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 16px 0;
}
.cbk-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.cbk-label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #9ca3af;
}
.cbk-valwrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}
.cbk-val {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}
.cbk-side {
  position: relative;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
  line-height: 1;
}
.cbk-side-box {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 2px;
}
.cbk-side-text {
  position: relative;
  z-index: 1;
}
.cbk-close {
  position: absolute;
  right: 16px;
  top: 16px;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0.7;
  z-index: 20;
}
/* coinbreaker3와 같게: 아이콘 칸은 항상 24px로 그리고, 버튼이 더 작으면 flex가 가로를 줄여 아이콘이 버튼 크기에 맞게 보인다 */
.cbk-close-svg {
  width: 24px;
  height: 24px;
}
.cbk-close:hover {
  opacity: 1;
}
/* 글자 줄 고정: 칸 크기는 보이지 않는 기본 글자(ghost)가 정하고, 실제 글자는 칸 왼쪽 위에 겹쳐 그린다 */
.cbk-fix {
  position: relative;
}
.cbk-ghost {
  visibility: hidden;
  pointer-events: none !important;
}
.cbk-real {
  position: absolute;
  left: 0;
  top: 0;
  width: max-content;
  white-space: nowrap;
}
.cbk-content .cbk-pick,
.cbk-content .cbk-edit {
  pointer-events: auto;
}
.cbk-sticker {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  user-select: none;
}
.cbk-sticker-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
}
.cbk-sticker-edit {
  pointer-events: auto;
  cursor: move;
  touch-action: none;
}
.cbk-sticker-edit:hover {
  outline: 1px dashed #818cf8;
}
.cbk-sticker-on {
  z-index: 30;
  outline: 1px dashed #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
}
.cbk-h {
  position: absolute;
  width: 9px;
  height: 9px;
  background: #ffffff;
  border: 1px solid #111827;
  touch-action: none;
}
.cbk-h-nw { left: -5px; top: -5px; cursor: nwse-resize; }
.cbk-h-n { left: calc(50% - 5px); top: -5px; cursor: ns-resize; }
.cbk-h-ne { right: -5px; top: -5px; cursor: nesw-resize; }
.cbk-h-e { right: -5px; top: calc(50% - 5px); cursor: ew-resize; }
.cbk-h-se { right: -5px; bottom: -5px; cursor: nwse-resize; }
.cbk-h-s { left: calc(50% - 5px); bottom: -5px; cursor: ns-resize; }
.cbk-h-sw { left: -5px; bottom: -5px; cursor: nesw-resize; }
.cbk-h-w { left: -5px; top: calc(50% - 5px); cursor: ew-resize; }
.cbk-editable {
  cursor: pointer;
}
.cbk-pick {
  cursor: pointer;
}
.cbk-pick:hover {
  outline: 1px dashed #818cf8;
  outline-offset: 2px;
}
.cbk-edit {
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
  background: rgba(255, 255, 255, 0.14);
  border: 1px dashed #818cf8;
  border-radius: 3px;
  padding: 0 2px;
  margin: 0;
  outline: none;
  min-width: 2ch;
  max-width: 100%;
}
</style>

<template>
  <!-- 이벤트 추가: 사이트 / 종류 / 제목만 정하면 만들어지고(처음엔 꺼짐), 나머지는 이벤트 설정에서 고친다 -->
  <div v-if="open" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4" @click.self="close">
    <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#07111d] p-5 shadow-2xl">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">{{ t('이벤트 추가', 'Add event') }}</h2>
        <button type="button" class="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15" @click="close">{{ t('닫기', 'Close') }}</button>
      </div>
      <div class="mt-4 space-y-3">
        <div>
          <label class="text-sm text-slate-300">{{ t('사이트', 'Site') }}</label>
          <div class="mt-1 flex gap-2">
            <button
              v-for="s in sites"
              :key="s.key"
              type="button"
              class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1"
              :class="site === s.key ? 'bg-cyan-500/20 text-cyan-100 ring-cyan-400/60' : 'bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10'"
              @click="site = s.key"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('이벤트 종류 (순위 기준)', 'Event type (ranked by)') }}</label>
          <select v-model="kind" class="mt-1 w-full rounded-lg bg-[#0b1726] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500">
            <option v-for="k in kinds" :key="k.key" :value="k.key">{{ k.label }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500">{{ kinds.find((k) => k.key === kind)?.desc }}</p>
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('제목', 'Title') }}</label>
          <input v-model="title" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" @keydown.enter="create" />
        </div>
        <p class="text-xs text-slate-500">{{ t('추가한 이벤트는 꺼진 상태로 만들어집니다. 상금·마감 일정을 정한 뒤 "진행"을 켜고 저장하세요.', 'New events start turned off. Set prizes and closing schedule, then turn it on and save.') }}</p>
        <p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15" @click="close">{{ t('취소', 'Cancel') }}</button>
          <button type="button" class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50" :disabled="saving" @click="create">
            {{ saving ? t('추가 중…', 'Adding…') : t('추가', 'Add') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'created', id: number): void }>()
const { t } = useLocale()

// 이벤트 종류(서버 event-engine.ts의 EVENT_KINDS와 같은 키)
const kinds = computed(() => [
  { key: 'weekly_volume', label: t('거래량 순위', 'Volume ranking'), desc: t('회차 동안 체결금액(진입 + 청산) 합계가 많은 순서', 'Highest total traded volume') },
  { key: 'trade_count', label: t('거래횟수 순위', 'Trade count ranking'), desc: t('회차 동안 거래(청산 완료) 횟수가 많은 순서', 'Most trades') },
  { key: 'max_bet', label: t('배팅왕', 'Biggest bet'), desc: t('한 번의 거래에 넣은 증거금(배팅금)이 가장 큰 순서', 'Largest single-trade margin') },
  { key: 'profit_sum', label: t('수익왕', 'Top profit'), desc: t('회차 동안 실현수익 합계가 큰 순서(수익이 있는 회원만)', 'Highest total realized profit') },
  { key: 'best_roe', label: t('수익률왕', 'Best ROE'), desc: t('한 번의 거래에서 낸 수익률(ROE)이 가장 높은 순서', 'Highest single-trade ROE') },
  { key: 'win_count', label: t('승리왕', 'Most wins'), desc: t('회차 동안 수익으로 끝난 거래 횟수가 많은 순서', 'Most winning trades') }
])
const sites = computed(() => [
  { key: 'test' as const, label: t('테스트', 'Test') },
  { key: 'ktx' as const, label: t('거래소', 'Exchange') }
])

const open = ref(false)
const site = ref<'test' | 'ktx'>('test')
const kind = ref('weekly_volume')
const title = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

function show() {
  open.value = true
  error.value = null
  title.value = ''
}
function close() {
  open.value = false
}
async function create() {
  if (saving.value) return
  saving.value = true
  error.value = null
  try {
    const res = await $fetch<{ id: number }>('/api/admin/events', { method: 'POST', body: { site: site.value, kind: kind.value, title: title.value } })
    open.value = false
    emit('created', res.id)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('추가하지 못했습니다.', 'Failed to add.')
  } finally {
    saving.value = false
  }
}
defineExpose({ show })
</script>

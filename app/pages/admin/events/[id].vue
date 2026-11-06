<template>
  <div class="space-y-6">
    <div v-if="loadError" class="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-rose-300">{{ loadError }}</div>
    <div v-else-if="!detail" class="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-semibold">{{ detail.event.label }}</h1>
            <span class="rounded px-2 py-0.5 text-xs font-semibold" :class="detail.event.site === 'test' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'">
              {{ detail.event.site === 'test' ? t('테스트 사이트', 'Test site') : t('거래소', 'Exchange') }}
            </span>
            <span class="rounded px-2 py-0.5 text-xs font-semibold" :class="draft.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-400'">
              {{ draft.enabled ? t('진행 중', 'Running') : t('중지됨', 'Stopped') }}
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-400">
            {{ t('종류', 'Type') }}: {{ detail.event.kind === 'weekly_volume' ? t('주간 거래량 순위', 'Weekly volume ranking') : detail.event.kind }}
            · {{ t('회원 화면 주소', 'Member page') }}: <span class="font-mono text-slate-300">/event/{{ detail.event.code }}</span>
          </p>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <!-- 이벤트 설정 -->
        <section class="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 class="text-base font-semibold">{{ t('이벤트 설정', 'Event settings') }}</h2>
          <label class="flex items-center gap-2 text-sm text-slate-200">
            <input v-model="draft.enabled" type="checkbox" class="h-4 w-4 accent-emerald-500" />
            {{ t('회원 화면에 이벤트 보이기(진행)', 'Show to members (running)') }}
          </label>
          <div>
            <label class="text-sm text-slate-300">{{ t('제목', 'Title') }}</label>
            <input v-model="draft.title" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
          </div>
          <div>
            <label class="text-sm text-slate-300">{{ t('설명', 'Description') }}</label>
            <textarea v-model="draft.description" rows="5" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
          </div>
          <!-- 회원이 영어로 볼 때 보이는 문구(비우면 한국어가 그대로 보인다) -->
          <div class="rounded-lg border border-white/10 bg-black/20 p-3">
            <div class="text-xs font-semibold text-slate-400">{{ t('영어 화면용 (선택)', 'For English screens (optional)') }}</div>
            <label class="mt-2 block text-sm text-slate-300">{{ t('영어 제목', 'English title') }}</label>
            <input v-model="draft.titleEn" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            <label class="mt-2 block text-sm text-slate-300">{{ t('영어 설명', 'English description') }}</label>
            <textarea v-model="draft.descriptionEn" rows="4" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
          </div>
          <div>
            <div class="flex items-center justify-between">
              <label class="text-sm text-slate-300">{{ t('상금', 'Prizes') }}</label>
              <button type="button" class="rounded px-2 py-1 text-xs text-cyan-300 hover:bg-white/10" @click="draft.prizes.push({ rank: '', reward: '' })">+ {{ t('추가', 'Add') }}</button>
            </div>
            <div v-for="(p, i) in draft.prizes" :key="i" class="mt-2 flex gap-2">
              <input v-model="p.rank" :placeholder="t('순위 (예: 1위)', 'Rank (e.g. 1st)')" class="w-28 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
              <input v-model="p.reward" :placeholder="t('상금 (예: 500 USDT)', 'Reward (e.g. 500 USDT)')" class="min-w-0 flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
              <button type="button" class="rounded px-2 text-slate-400 hover:bg-white/10 hover:text-white" @click="draft.prizes.splice(i, 1)">✕</button>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <span v-if="saveMsg" class="text-sm text-emerald-300">{{ saveMsg }}</span>
            <button type="button" class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50" :disabled="saving" @click="save">
              {{ saving ? t('저장 중...', 'Saving...') : t('저장', 'Save') }}
            </button>
          </div>
          <p v-if="saveError" class="text-sm text-rose-300">{{ saveError }}</p>
        </section>

        <!-- 순위 -->
        <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">{{ t('거래량 순위', 'Volume ranking') }}</h2>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ fmtDay(detail.period.from) }} ~ {{ fmtDay(lastDay(detail.period.to)) }} ({{ t('한국시간', 'KST') }}) · {{ t('거래량 = 체결금액(진입 + 청산) 합계, 일반 회원만', 'Volume = open + close notional, members only') }}
              </p>
            </div>
            <div class="flex gap-1 rounded-lg bg-black/30 p-1 text-xs">
              <button type="button" class="rounded-md px-3 py-1.5" :class="week === 'this' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'" @click="week = 'this'">{{ t('이번 주', 'This week') }}</button>
              <button type="button" class="rounded-md px-3 py-1.5" :class="week === 'last' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'" @click="week = 'last'">{{ t('지난 주', 'Last week') }}</button>
            </div>
          </div>
          <div v-if="!detail.ranking.length" class="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">{{ t('기록이 없습니다.', 'No records.') }}</div>
          <div v-else class="mt-4 max-h-[640px] overflow-auto rounded-lg border border-white/10">
            <table class="min-w-full text-sm">
              <thead class="sticky top-0 bg-[#0a1a2a] text-xs text-slate-400">
                <tr>
                  <th class="px-3 py-2 text-left">{{ t('순위', 'Rank') }}</th>
                  <th class="px-3 py-2 text-left">{{ t('아이디', 'ID') }}</th>
                  <th class="px-3 py-2 text-right">{{ t('거래량 (USDT)', 'Volume (USDT)') }}</th>
                  <th class="px-3 py-2 text-right">{{ t('거래 횟수', 'Trades') }}</th>
                  <th class="px-3 py-2 text-left">{{ t('상금', 'Prize') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in detail.ranking" :key="r.userId" class="border-t border-white/5">
                  <td class="px-3 py-2 font-semibold text-slate-100">{{ r.rank }}</td>
                  <td class="px-3 py-2 font-mono">
                    <button type="button" class="text-cyan-300 hover:underline" @click="memberInfoModal?.open(r.username)">{{ r.username }}</button>
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-slate-100">{{ fmtUsd(r.volume) }}</td>
                  <td class="px-3 py-2 text-right text-slate-400">{{ r.trades }}</td>
                  <td class="px-3 py-2 text-amber-300">{{ prizeFor(r.rank) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
    <AdminMemberInfoModal ref="memberInfoModal" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin', 'super-admin'] })

type Prize = { rank: string; reward: string }
type Detail = {
  event: {
    id: number
    site: string
    code: string
    name: string
    kind: string
    title: string
    description: string
    titleEn: string
    descriptionEn: string
    prizes: Prize[]
    enabled: boolean
    label: string
  }
  period: { from: string; to: string; week: string }
  ranking: Array<{ rank: number; userId: number; username: string; volume: number; trades: number }>
}

const { t } = useLocale()
const route = useRoute()
const memberInfoModal = ref<any>(null)
const id = computed(() => Number(route.params.id))
const week = ref<'this' | 'last'>('this')
const detail = ref<Detail | null>(null)
const loadError = ref<string | null>(null)
const draft = reactive<{ title: string; description: string; titleEn: string; descriptionEn: string; enabled: boolean; prizes: Prize[] }>({
  title: '',
  description: '',
  titleEn: '',
  descriptionEn: '',
  enabled: true,
  prizes: []
})
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveMsg = ref<string | null>(null)

async function load(resetDraft = true) {
  loadError.value = null
  try {
    const res = await $fetch<Detail>(`/api/admin/events/${id.value}`, { query: { week: week.value } })
    detail.value = res
    if (resetDraft) {
      draft.title = res.event.title
      draft.description = res.event.description
      draft.titleEn = res.event.titleEn || ''
      draft.descriptionEn = res.event.descriptionEn || ''
      draft.enabled = res.event.enabled
      draft.prizes = res.event.prizes.map((p) => ({ rank: String(p.rank || ''), reward: String(p.reward || '') }))
    }
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || t('이벤트를 불러오지 못했습니다.', 'Failed to load the event.')
  }
}

async function save() {
  saving.value = true
  saveError.value = null
  saveMsg.value = null
  try {
    await $fetch(`/api/admin/events/${id.value}`, {
      method: 'POST',
      body: { title: draft.title, description: draft.description, titleEn: draft.titleEn, descriptionEn: draft.descriptionEn, enabled: draft.enabled, prizes: draft.prizes.filter((p) => p.rank.trim() && p.reward.trim()) }
    })
    saveMsg.value = t('저장했습니다.', 'Saved.')
    await load(true)
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    saving.value = false
  }
}

function prizeFor(rank: number) {
  for (const p of detail.value?.event.prizes || []) {
    const m = String(p.rank).match(/(\d+)\s*(?:~|-)\s*(\d+)/)
    if (m && rank >= Number(m[1]) && rank <= Number(m[2])) return p.reward
    const one = String(p.rank).match(/^(\d+)/)
    if (!m && one && Number(one[1]) === rank) return p.reward
  }
  return ''
}
function fmtUsd(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', weekday: 'short' })
}
function lastDay(iso: string) {
  return new Date(new Date(iso).getTime() - 1000).toISOString()
}

watch(week, () => load(false))
watch(id, () => load(true))
onMounted(() => load(true))
</script>

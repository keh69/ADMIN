<template>
  <div class="space-y-6">
    <div v-if="loadError" class="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-rose-300">{{ loadError }}</div>
    <div v-else-if="!detail" class="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
    <template v-else>
      <!-- 이벤트 고르기: 위 카드를 누르면 이벤트 목록이 펼쳐진다(이벤트 추가 버튼 포함) -->
      <div ref="pickerEl" class="relative">
        <button
          type="button"
          class="flex w-full flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:border-cyan-400/40 hover:bg-white/[0.07]"
          @click="pickerOpen = !pickerOpen"
        >
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-semibold">{{ detail.event.label }}</h1>
              <span class="rounded px-2 py-0.5 text-xs font-semibold" :class="detail.event.enabledTest ? 'bg-sky-500/20 text-sky-300' : 'bg-white/10 text-slate-500'">
                {{ t('테스트', 'Test') }} {{ detail.event.enabledTest ? t('진행', 'on') : t('중지', 'off') }}
              </span>
              <span class="rounded px-2 py-0.5 text-xs font-semibold" :class="detail.event.enabledKtx ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-slate-500'">
                {{ t('거래소', 'Exchange') }} {{ detail.event.enabledKtx ? t('진행', 'on') : t('중지', 'off') }}
              </span>
            </div>
            <p class="mt-1 text-sm text-slate-400">
              {{ t('종류', 'Type') }}: {{ kindMeta(detail.event.kind)?.label || detail.event.kind }}
              · {{ t('마감', 'Closes') }}: {{ t(`매주 ${dows[detail.event.closeDow]}요일 ${detail.event.closeTime}`, `Every ${dows[detail.event.closeDow]} ${detail.event.closeTime}`) }}
              · {{ t('회원 화면 주소', 'Member page') }}: <span class="font-mono text-slate-300">/event/{{ detail.event.code }}</span>
            </p>
          </div>
          <span class="mt-1 text-sm text-slate-400">{{ t('이벤트 선택', 'Choose event') }} {{ pickerOpen ? '▴' : '▾' }}</span>
        </button>
        <div v-if="pickerOpen" class="absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-white/10 bg-[#07111d] p-2 shadow-2xl">
          <button
            v-for="e in eventList"
            :key="e.id"
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm transition"
            :class="e.id === id ? 'bg-cyan-500/15 text-white' : 'text-slate-200 hover:bg-white/5'"
            @click="pickEvent(e.id)"
          >
            <span class="flex items-center gap-2">
              <span class="font-semibold">{{ e.label }}</span>
              <span class="text-slate-400">{{ e.title }}</span>
            </span>
            <span class="flex items-center gap-2 text-xs">
              <span class="text-slate-500">{{ e.kindLabel }}</span>
              <span :class="e.enabledTest ? 'text-sky-300' : 'text-slate-600'">{{ t('테스트', 'Test') }} {{ e.enabledTest ? t('진행', 'on') : t('중지', 'off') }}</span>
              <span :class="e.enabledKtx ? 'text-amber-300' : 'text-slate-600'">{{ t('거래소', 'Exchange') }} {{ e.enabledKtx ? t('진행', 'on') : t('중지', 'off') }}</span>
            </span>
          </button>
          <div class="mt-1 border-t border-white/10 px-2 pt-2">
            <button type="button" class="w-full rounded-xl bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25" @click="openAdd">
              + {{ t('이벤트 추가', 'Add event') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 탭: 이벤트 설정 / 당첨쪽지 -->
      <div class="flex gap-1 border-b border-white/10">
        <button
          v-for="tb in tabs"
          :key="tb.key"
          type="button"
          class="border-b-2 px-4 py-2 text-sm font-medium transition"
          :class="tab === tb.key ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
          @click="tab = tb.key"
        >
          {{ tb.label }}
        </button>
      </div>

      <div v-show="tab === 'settings'" class="grid gap-6 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <!-- 이벤트 설정 -->
        <section class="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 class="text-base font-semibold">{{ t('이벤트 설정', 'Event settings') }}</h2>
          <!-- 왼쪽: 사이트별 진행(체크하면 그 사이트 회원 화면에 이벤트 메뉴가 보이고 진행) / 오른쪽: 이벤트 페이지 첫 화면 어셋 -->
          <div class="flex flex-wrap items-start gap-6">
          <div class="min-w-0 flex-1 space-y-2">
            <label class="flex items-center gap-2 text-sm text-slate-200">
              <input v-model="draft.enabledTest" type="checkbox" class="h-4 w-4 accent-sky-500" />
              {{ t('테스트(진행)', 'Test (running)') }}
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-200">
              <input v-model="draft.enabledKtx" type="checkbox" class="h-4 w-4 accent-amber-500" />
              {{ t('거래소(진행)', 'Exchange (running)') }}
            </label>
            <p class="text-xs text-slate-500">{{ t('체크한 사이트에 이벤트 탭이 보이고 진행됩니다. 두 사이트를 모두 체크해도 상금은 회차마다 한 번만 지급됩니다.', 'Checked sites show the event tab. Prizes are paid once per round even if both are checked.') }}</p>
          </div>
          <div class="flex items-start gap-3">
            <div>
              <label class="text-sm text-slate-300">{{ t('어셋', 'Asset') }}</label>
              <select v-model.number="draft.asset" class="mt-1 block rounded-lg bg-[#0b1726] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500">
                <option v-for="a in PIXEL_ASSET_NAMES" :key="a.id" :value="a.id">{{ t(`어셋${a.id} · ${a.name}`, `Asset ${a.id} · ${a.nameEn}`) }}</option>
              </select>
              <p class="mt-1 text-[11px] text-slate-500">{{ t('이벤트 페이지 첫 화면 그림', 'Event page hero art') }}</p>
            </div>
            <div class="flex h-24 w-20 items-end justify-center rounded-lg bg-black/40 p-1.5">
              <PixelAsset :asset="draft.asset" class="h-full w-full" />
            </div>
          </div>
          </div>
          <div>
            <label class="text-sm text-slate-300">{{ t('이벤트 종류 (순위 기준)', 'Event type (ranked by)') }}</label>
            <select v-model="draft.kind" class="mt-1 w-full rounded-lg bg-[#0b1726] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500">
              <option v-for="k in detail.kinds" :key="k.key" :value="k.key">{{ k.label }}</option>
            </select>
            <p class="mt-1 text-xs text-slate-500">{{ kindMeta(draft.kind)?.desc }}</p>
          </div>
          <div>
            <label class="text-sm text-slate-300">{{ t('마감 일정 (한국시간, 매주)', 'Closing schedule (KST, weekly)') }}</label>
            <div class="mt-1 flex items-center gap-2">
              <select v-model.number="draft.closeDow" class="rounded-lg bg-[#0b1726] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500">
                <option v-for="(d, i) in dows" :key="i" :value="i">{{ d }}{{ t('요일', '') }}</option>
              </select>
              <input v-model="draft.closeTime" type="time" class="rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500 [color-scheme:dark]" />
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ t('이 시각에 회차가 마감되고, 그 회차 순위대로 상금이 지갑에 지급된 뒤 당첨 쪽지가 발송됩니다.', 'At this time the round closes; prizes are paid to wallets by final rank and a winning message is sent.') }}</p>
          </div>
          <div>
            <label class="text-sm text-slate-300">{{ t('제목', 'Title') }}</label>
            <input v-model="draft.title" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
          </div>
          <div>
            <label class="text-sm text-slate-300">{{ t('설명', 'Description') }}</label>
            <textarea v-model="draft.description" rows="5" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
          </div>
          <!-- 영어 제목/설명: 위 한글을 자동 번역해서 채운다(고칠 수도 있음) -->
          <div class="rounded-lg border border-white/10 bg-black/20 p-3">
            <div class="flex items-center justify-between">
              <div class="text-xs font-semibold text-slate-400">{{ t('영어 화면용 (한글을 자동 번역)', 'For English screens (auto-translated)') }}</div>
              <span class="text-xs" :class="translateError ? 'text-rose-300' : 'text-slate-500'">{{ translateError || (translating ? t('번역 중…', 'Translating…') : '') }}</span>
            </div>
            <label class="mt-2 block text-sm text-slate-300">{{ t('영어 제목', 'English title') }}</label>
            <input v-model="draft.titleEn" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            <label class="mt-2 block text-sm text-slate-300">{{ t('영어 설명', 'English description') }}</label>
            <textarea v-model="draft.descriptionEn" rows="4" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
          </div>
          <!-- 상금: 순위(1, 2, 5~10) / USDT -->
          <div>
            <div class="flex items-center justify-between">
              <label class="text-sm text-slate-300">{{ t('상금', 'Prizes') }}</label>
              <button type="button" class="rounded px-2 py-1 text-xs text-cyan-300 hover:bg-white/10" @click="draft.prizes.push({ rank: '', reward: '' })">+ {{ t('추가', 'Add') }}</button>
            </div>
            <div class="mt-2 grid grid-cols-[112px_minmax(0,1fr)_32px] gap-2 px-1 text-xs font-semibold text-slate-400">
              <span>{{ t('순위', 'Rank') }}</span>
              <span>USDT</span>
              <span></span>
            </div>
            <div v-for="(p, i) in draft.prizes" :key="i" class="mt-1.5 grid grid-cols-[112px_minmax(0,1fr)_32px] gap-2">
              <input v-model="p.rank" placeholder="1 / 5~10" class="rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
              <input v-model="p.reward" inputmode="decimal" placeholder="1000" class="min-w-0 rounded-lg bg-white/5 px-3 py-2 text-right text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
              <button type="button" class="rounded text-slate-400 hover:bg-white/10 hover:text-white" @click="draft.prizes.splice(i, 1)">✕</button>
            </div>
            <p class="mt-1.5 text-xs text-slate-500">{{ t('순위는 숫자만(예: 1). 5~10처럼 쓰면 5위부터 10위까지 같은 상금입니다. 상금도 숫자만 입력합니다.', 'Rank: number only (e.g. 1). "5~10" gives ranks 5 to 10 the same prize. Prize: number only.') }}</p>
          </div>
          <div class="flex items-center justify-end gap-2">
            <span v-if="saveMsg" class="text-sm text-emerald-300">{{ saveMsg }}</span>
            <button type="button" class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50" :disabled="saving" @click="save">
              {{ saving ? t('저장 중...', 'Saving...') : t('저장', 'Save') }}
            </button>
          </div>
          <p v-if="saveError" class="text-sm text-rose-300">{{ saveError }}</p>
        </section>

        <div class="space-y-6">
          <!-- 순위 -->
          <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold">{{ kindMeta(detail.event.kind)?.label }}</h2>
                <p class="mt-0.5 text-xs text-slate-500">
                  {{ fmtDateTime(detail.period.from) }} ~ {{ fmtDateTime(detail.period.to) }} ({{ t('한국시간', 'KST') }}) · {{ kindMeta(detail.event.kind)?.desc }} · {{ t('일반 회원만', 'members only') }}
                </p>
              </div>
              <div class="flex gap-1 rounded-lg bg-black/30 p-1 text-xs">
                <button type="button" class="rounded-md px-3 py-1.5" :class="week === 'this' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'" @click="week = 'this'">{{ t('이번 회차', 'This round') }}</button>
                <button type="button" class="rounded-md px-3 py-1.5" :class="week === 'last' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'" @click="week = 'last'">{{ t('지난 회차', 'Last round') }}</button>
              </div>
            </div>
            <div v-if="!detail.ranking.length" class="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">{{ t('기록이 없습니다.', 'No records.') }}</div>
            <div v-else class="mt-4 max-h-[560px] overflow-auto rounded-lg border border-white/10">
              <table class="min-w-full text-sm">
                <thead class="sticky top-0 bg-[#0a1a2a] text-xs text-slate-400">
                  <tr>
                    <th class="px-3 py-2 text-left">{{ t('순위', 'Rank') }}</th>
                    <th class="px-3 py-2 text-left">{{ t('아이디', 'ID') }}</th>
                    <th class="px-3 py-2 text-right">{{ kindMeta(detail.event.kind)?.score }} ({{ kindMeta(detail.event.kind)?.unit }})</th>
                    <th class="px-3 py-2 text-right">{{ t('거래 횟수', 'Trades') }}</th>
                    <th class="px-3 py-2 text-right">{{ t('상금 (USDT)', 'Prize (USDT)') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in detail.ranking" :key="r.userId" class="border-t border-white/5">
                    <td class="px-3 py-2 font-semibold text-slate-100">{{ r.rank }}</td>
                    <td class="px-3 py-2 font-mono">
                      <button type="button" class="text-cyan-300 hover:underline" @click="memberInfoModal?.open(r.username)">{{ r.username }}</button>
                    </td>
                    <td class="px-3 py-2 text-right font-mono text-slate-100">{{ fmtScore(r.score) }}</td>
                    <td class="px-3 py-2 text-right text-slate-400">{{ r.trades }}</td>
                    <td class="px-3 py-2 text-right text-amber-300">{{ prizeFor(r.rank) ? fmtNum(prizeFor(r.rank)) : '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 지급 내역 -->
          <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 class="text-base font-semibold">{{ t('지급 내역', 'Payouts') }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">{{ t('회차가 마감되면 순위대로 지갑에 자동 지급되고 당첨 쪽지가 발송됩니다(최근 100건).', 'Paid automatically by rank when a round closes, with a winning message (latest 100).') }}</p>
            <div v-if="!detail.payouts.length" class="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">{{ t('아직 지급 내역이 없습니다.', 'No payouts yet.') }}</div>
            <div v-else class="mt-4 max-h-[420px] overflow-auto rounded-lg border border-white/10">
              <table class="min-w-full text-sm">
                <thead class="sticky top-0 bg-[#0a1a2a] text-xs text-slate-400">
                  <tr>
                    <th class="px-3 py-2 text-left">{{ t('회차 마감', 'Round closed') }}</th>
                    <th class="px-3 py-2 text-left">{{ t('순위', 'Rank') }}</th>
                    <th class="px-3 py-2 text-left">{{ t('아이디', 'ID') }}</th>
                    <th class="px-3 py-2 text-right">{{ t('상금 (USDT)', 'Prize (USDT)') }}</th>
                    <th class="px-3 py-2 text-center">{{ t('쪽지', 'Message') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in detail.payouts" :key="`${p.periodTo}-${p.userId}`" class="border-t border-white/5">
                    <td class="px-3 py-2 text-slate-300">{{ fmtDateTime(p.periodTo) }}</td>
                    <td class="px-3 py-2 font-semibold text-slate-100">{{ p.rank }}</td>
                    <td class="px-3 py-2 font-mono text-slate-200">{{ p.username }}</td>
                    <td class="px-3 py-2 text-right text-amber-300">{{ fmtNum(p.amount) }}</td>
                    <td class="px-3 py-2 text-center" :class="p.messageSent ? 'text-emerald-300' : 'text-slate-500'">{{ p.messageSent ? t('발송', 'Sent') : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <!-- 당첨쪽지: 모든 이벤트 공통 문구 -->
      <section v-show="tab === 'message'" class="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <h2 class="text-base font-semibold">{{ t('당첨쪽지', 'Winning message') }}</h2>
          <p class="mt-1 text-sm text-slate-400">
            {{ t('회차가 마감되어 상금이 지급되면 당첨된 회원에게 이 쪽지가 발송됩니다(모든 이벤트 공통).', 'Sent to each winner when prizes are paid (shared by all events).') }}
            {{ t('문구 안의', 'In the text,') }}
            <code class="rounded bg-black/40 px-1 text-cyan-200">[제목]</code> {{ t('은 이벤트 제목,', '= event title,') }}
            <code class="rounded bg-black/40 px-1 text-cyan-200">[순위]</code> {{ t('는 회원의 순위(예: 3위),', '= rank (e.g. 3위),') }}
            <code class="rounded bg-black/40 px-1 text-cyan-200">[당첨금]</code> {{ t('은 당첨 금액(예: 1,000 USDT)으로 바뀌어 발송됩니다.', '= prize (e.g. 1,000 USDT).') }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-for="tag in ['[제목]', '[순위]', '[당첨금]']" :key="tag" type="button" class="rounded-md bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25" @click="insertTag(tag)">
            {{ tag }} {{ t('넣기', 'insert') }}
          </button>
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('쪽지 제목', 'Subject') }}</label>
          <input ref="subjectEl" v-model="winMsg.subject" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-cyan-500" @focus="lastFocus = 'subject'" />
        </div>
        <div>
          <label class="text-sm text-slate-300">{{ t('쪽지 내용', 'Body') }}</label>
          <textarea ref="bodyEl" v-model="winMsg.body" rows="22" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm leading-6 outline-none ring-1 ring-white/10 focus:ring-cyan-500" @focus="lastFocus = 'body'" />
        </div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-4">
          <div class="text-xs font-semibold text-slate-400">{{ t('미리보기 (예: 이 이벤트 3위, 1,000 USDT)', 'Preview (e.g. rank 3, 1,000 USDT)') }}</div>
          <div class="mt-2 text-sm font-semibold text-slate-100">{{ renderPreview(winMsg.subject) }}</div>
          <div class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{{ renderPreview(winMsg.body) }}</div>
        </div>
        <div class="flex items-center justify-end gap-2">
          <span v-if="winMsgSaved" class="text-sm text-emerald-300">{{ winMsgSaved }}</span>
          <span v-if="winMsgError" class="text-sm text-rose-300">{{ winMsgError }}</span>
          <button type="button" class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15" @click="resetWinMsg">{{ t('기본 문구로', 'Reset to default') }}</button>
          <button type="button" class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50" :disabled="winMsgSaving" @click="saveWinMsg">
            {{ winMsgSaving ? t('저장 중...', 'Saving...') : t('저장', 'Save') }}
          </button>
        </div>
      </section>
    </template>
    <AdminMemberInfoModal ref="memberInfoModal" />
    <AdminEventAddModal ref="addModal" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin', 'super-admin'] })
import { PIXEL_ASSET_NAMES } from '~/utils/pixelAssets'

type Prize = { rank: string; reward: string }
type KindMeta = { key: string; label: string; score: string; unit: string; decimals: number; desc: string }
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
    enabledTest: boolean
    enabledKtx: boolean
    asset: number
    closeDow: number
    closeTime: string
    label: string
  }
  kinds: KindMeta[]
  dows: string[]
  period: { from: string; to: string; week: string }
  ranking: Array<{ rank: number; userId: number; username: string; score: number; volume: number; trades: number }>
  payouts: Array<{ periodFrom: string; periodTo: string; userId: number; username: string; rank: number; score: number; amount: number; messageSent: boolean; paidAt: string }>
}
type EventItem = { id: number; site: string; code: string; label: string; title: string; kind: string; kindLabel: string; enabled: boolean; enabledTest: boolean; enabledKtx: boolean }

const { t } = useLocale()
const route = useRoute()
const memberInfoModal = ref<any>(null)
const addModal = ref<any>(null)
const id = computed(() => Number(route.params.id))
const week = ref<'this' | 'last'>('this')
const detail = ref<Detail | null>(null)
const loadError = ref<string | null>(null)
const dows = computed(() => detail.value?.dows || ['월', '화', '수', '목', '금', '토', '일'])
const tab = ref<'settings' | 'message'>('settings')
const tabs = computed(() => [
  { key: 'settings' as const, label: t('이벤트 설정', 'Event settings') },
  { key: 'message' as const, label: t('당첨쪽지', 'Winning message') }
])
const draft = reactive<{ title: string; description: string; titleEn: string; descriptionEn: string; enabledTest: boolean; enabledKtx: boolean; asset: number; kind: string; closeDow: number; closeTime: string; prizes: Prize[] }>({
  title: '',
  description: '',
  titleEn: '',
  descriptionEn: '',
  enabledTest: false,
  enabledKtx: false,
  asset: 1,
  kind: 'weekly_volume',
  closeDow: 0,
  closeTime: '00:00',
  prizes: []
})
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveMsg = ref<string | null>(null)

function kindMeta(k: string) {
  return detail.value?.kinds.find((x) => x.key === k)
}

// ── 이벤트 고르기 / 추가 ──
const pickerOpen = ref(false)
const pickerEl = ref<HTMLElement | null>(null)
const eventList = ref<EventItem[]>([])
async function loadEventList() {
  const res = await $fetch<{ items: EventItem[] }>('/api/admin/events').catch(() => ({ items: [] as EventItem[] }))
  eventList.value = res.items || []
}
function pickEvent(eid: number) {
  pickerOpen.value = false
  if (eid !== id.value) navigateTo(`/admin/events/${eid}`)
}
function openAdd() {
  pickerOpen.value = false
  addModal.value?.show()
}
async function onCreated(eid: number) {
  await loadEventList()
  navigateTo(`/admin/events/${eid}`)
}
function onDocClick(e: MouseEvent) {
  if (pickerOpen.value && pickerEl.value && !pickerEl.value.contains(e.target as Node)) pickerOpen.value = false
}

// ── 불러오기 / 저장 ──
let suppressTranslate = false
async function load(resetDraft = true) {
  loadError.value = null
  try {
    const res = await $fetch<Detail>(`/api/admin/events/${id.value}`, { query: { week: week.value } })
    detail.value = res
    if (resetDraft) {
      suppressTranslate = true
      draft.title = res.event.title
      draft.description = res.event.description
      draft.titleEn = res.event.titleEn || ''
      draft.descriptionEn = res.event.descriptionEn || ''
      draft.enabledTest = !!res.event.enabledTest
      draft.enabledKtx = !!res.event.enabledKtx
      draft.asset = Number(res.event.asset) || 1
      draft.kind = res.event.kind
      draft.closeDow = res.event.closeDow
      draft.closeTime = res.event.closeTime
      draft.prizes = res.event.prizes.map((p) => ({ rank: String(p.rank || '').replace(/\s*위\s*$/, ''), reward: String(p.reward || '').replace(/[^\d.]/g, '') }))
      nextTick(() => {
        suppressTranslate = false
      })
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
    // 영어 칸이 아직 번역 중이면 끝날 때까지 기다린다
    await flushTranslate()
    await $fetch(`/api/admin/events/${id.value}`, {
      method: 'POST',
      body: {
        title: draft.title,
        description: draft.description,
        titleEn: draft.titleEn,
        descriptionEn: draft.descriptionEn,
        enabledTest: draft.enabledTest,
        enabledKtx: draft.enabledKtx,
        asset: Number(draft.asset) || 1,
        kind: draft.kind,
        closeDow: Number(draft.closeDow) || 0,
        closeTime: draft.closeTime || '00:00',
        prizes: draft.prizes
          .map((p) => ({ rank: String(p.rank || '').replace(/\s+/g, '').replace(/위$/, ''), reward: String(p.reward || '').replace(/[^\d.]/g, '') }))
          .filter((p) => p.rank && p.reward)
      }
    })
    saveMsg.value = t('저장했습니다.', 'Saved.')
    await Promise.all([load(true), loadEventList()])
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    saving.value = false
  }
}

// ── 한글 → 영어 자동 번역(입력을 멈추고 0.8초 뒤) ──
const translating = ref(false)
const translateError = ref<string | null>(null)
let translateTimer: ReturnType<typeof setTimeout> | null = null
let pendingTranslate: Array<'title' | 'description'> = []
async function translateText(text: string) {
  const res = await $fetch<{ text: string }>('/api/admin/translate', { method: 'POST', body: { text } })
  return res.text || ''
}
async function runTranslate() {
  translateTimer = null
  const fields = Array.from(new Set(pendingTranslate))
  pendingTranslate = []
  if (!fields.length) return
  translating.value = true
  translateError.value = null
  try {
    for (const f of fields) {
      if (f === 'title') draft.titleEn = draft.title.trim() ? await translateText(draft.title) : ''
      else draft.descriptionEn = draft.description.trim() ? await translateText(draft.description) : ''
    }
  } catch {
    translateError.value = t('자동 번역 실패(직접 입력 가능)', 'Auto-translate failed (you can type it)')
  } finally {
    translating.value = false
  }
}
function queueTranslate(field: 'title' | 'description') {
  if (suppressTranslate) return
  pendingTranslate.push(field)
  if (translateTimer) clearTimeout(translateTimer)
  translateTimer = setTimeout(runTranslate, 800)
}
async function flushTranslate() {
  if (translateTimer) {
    clearTimeout(translateTimer)
    await runTranslate()
  }
}
watch(() => draft.title, () => queueTranslate('title'))
watch(() => draft.description, () => queueTranslate('description'))

// ── 당첨쪽지 ──
const winMsg = reactive({ subject: '', body: '', defaultSubject: '', defaultBody: '' })
const winMsgSaving = ref(false)
const winMsgSaved = ref<string | null>(null)
const winMsgError = ref<string | null>(null)
const subjectEl = ref<HTMLInputElement | null>(null)
const bodyEl = ref<HTMLTextAreaElement | null>(null)
const lastFocus = ref<'subject' | 'body'>('body')
async function loadWinMsg() {
  const res = await $fetch<{ subject: string; body: string; defaultSubject: string; defaultBody: string }>('/api/admin/events/win-message').catch(() => null)
  if (res) Object.assign(winMsg, res)
}
function insertTag(tag: string) {
  const el = lastFocus.value === 'subject' ? subjectEl.value : bodyEl.value
  const key = lastFocus.value
  const cur = winMsg[key]
  const s = el?.selectionStart ?? cur.length
  const e = el?.selectionEnd ?? cur.length
  winMsg[key] = cur.slice(0, s) + tag + cur.slice(e)
  nextTick(() => {
    el?.focus()
    el?.setSelectionRange(s + tag.length, s + tag.length)
  })
}
function renderPreview(text: string) {
  return String(text || '')
    .replace(/\[제목\]/g, detail.value?.event.title || '이벤트')
    .replace(/\[순위\]/g, '3위')
    .replace(/\[당첨금\]/g, '1,000 USDT')
}
function resetWinMsg() {
  winMsg.subject = winMsg.defaultSubject
  winMsg.body = winMsg.defaultBody
}
async function saveWinMsg() {
  winMsgSaving.value = true
  winMsgSaved.value = null
  winMsgError.value = null
  try {
    await $fetch('/api/admin/events/win-message', { method: 'POST', body: { subject: winMsg.subject, body: winMsg.body } })
    winMsgSaved.value = t('저장했습니다.', 'Saved.')
  } catch (e: any) {
    winMsgError.value = e?.data?.statusMessage || t('저장 실패', 'Save failed')
  } finally {
    winMsgSaving.value = false
  }
}

// ── 표시 ──
function prizeFor(rank: number) {
  for (const p of detail.value?.event.prizes || []) {
    const s = String(p.rank)
    const m = s.match(/(\d+)\s*[~\-]\s*(\d+)/)
    const amt = Number(String(p.reward).replace(/[^\d.]/g, '')) || 0
    if (m && rank >= Number(m[1]) && rank <= Number(m[2])) return amt
    const one = s.match(/^(\d+)/)
    if (!m && one && Number(one[1]) === rank) return amt
  }
  return 0
}
function fmtNum(v: number) {
  return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
}
function fmtScore(v: number) {
  const d = kindMeta(detail.value?.event.kind || '')?.decimals ?? 2
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

watch(week, () => load(false))
watch(id, () => {
  week.value = 'this'
  load(true)
})
onMounted(() => {
  load(true)
  loadEventList()
  loadWinMsg()
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

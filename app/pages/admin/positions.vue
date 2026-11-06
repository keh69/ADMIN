<template>
  <!-- 회원목록과 같은 표 디자인: 폭 1500px 한 덩어리(제목·검색줄·표·페이지)를 화면 가운데에 -->
  <div class="lg:mx-[calc(24px_-_21.42857%)]">
  <div class="mx-auto w-[1500px] max-w-full space-y-3">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h1 class="text-base font-semibold text-slate-100">{{ t('포지션 목록', 'Positions') }}</h1>
        <p class="text-[12px] text-slate-500">{{ t('실시간 오픈 포지션을 5초마다 갱신합니다.', 'Live open positions refresh every 5 seconds.') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="border border-white/20 bg-white/[0.06] px-3 py-1 text-[13px] hover:bg-white/10">{{ t('대시보드', 'Dashboard') }}</NuxtLink>
        <span class="border border-white/10 px-3 py-1.5 text-xs font-data text-slate-300">
          {{ lastUpdatedText }}
        </span>
      </div>
    </div>

    <div class="grid gap-2 sm:grid-cols-2">
      <div class="border border-white/10 px-3 py-1.5 text-[13px] text-slate-200">
        <div class="text-xs text-cyan-300/80">{{ t('총 인원', 'Total Members') }}</div>
        <div class="font-data text-lg font-semibold">{{ t(`${summary.members.toLocaleString('ko-KR')}명`, `${summary.members.toLocaleString('en-US')}`) }}</div>
        <div class="text-xs text-cyan-300/70">{{ t(`포지션 ${summary.positions.toLocaleString('ko-KR')}건`, `${summary.positions.toLocaleString('en-US')} position(s)`) }}</div>
      </div>
      <div class="border border-white/10 px-3 py-1.5 text-[13px] text-slate-200">
        <div class="text-xs text-cyan-300/80">{{ t('총 거래금액 합산', 'Total Trade Amount') }}</div>
        <div class="font-data text-lg font-semibold">{{ fmtKrw(summary.notionalUsdt) }}</div>
        <div class="font-data text-xs text-cyan-300/70">({{ fmtNum(summary.notionalUsdt) }} USDT · {{ t(`환율 ${Math.round(krwPerUsdt).toLocaleString('ko-KR')}원`, `FX ${Math.round(krwPerUsdt).toLocaleString('en-US')} KRW`) }})</div>
      </div>
    </div>

    <div>
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="memberFilter"
          class="border border-white/15 bg-[#06101b] px-2 py-1 text-[13px] text-slate-200 outline-none focus:border-cyan-400"
        >
          <option value="">{{ t('회원 이름', 'Member Name') }}</option>
          <option v-for="name in memberOptions" :key="name" :value="name">{{ name }}</option>
        </select>

        <input
          v-model.trim="keyword"
          class="border border-white/15 bg-[#06101b] px-2 py-1 text-[13px] text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400"
          :placeholder="t('검색어를 입력하세요', 'Enter a search term')"
          :key="`positions-search-${locale}`"
        />

        <select
          v-model="symbolFilter"
          class="border border-white/15 bg-[#06101b] px-2 py-1 text-[13px] text-slate-200 outline-none focus:border-cyan-400"
        >
          <option value="">{{ t('심볼', 'Symbol') }}</option>
          <option v-for="sym in symbolOptions" :key="sym" :value="sym">{{ sym }}</option>
        </select>

        <select
          v-model="positionFilter"
          class="border border-white/15 bg-[#06101b] px-2 py-1 text-[13px] text-slate-200 outline-none focus:border-cyan-400"
        >
          <option value="">{{ t('포지션', 'Position') }}</option>
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>

        <select
          v-model="settledFilter"
          class="border border-white/15 bg-[#06101b] px-2 py-1 text-[13px] text-slate-200 outline-none focus:border-cyan-400"
        >
          <option value="">{{ t('접속여부', 'Status') }}</option>
          <option value="접속">{{ t('접속', 'Online') }}</option>
          <option value="미접속">{{ t('미접속', 'Offline') }}</option>
        </select>
      </div>

      <div class="mt-3 overflow-x-auto">
        <table class="w-full border-collapse text-[14px] text-slate-200">
          <thead class="bg-white/[0.04] text-slate-400">
            <tr>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-left font-normal">{{ t('회원아이디', 'Username') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-left font-normal">{{ t('회원 이름', 'Name') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-left font-normal">{{ t('소속총판', 'Affiliate') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-left font-normal">{{ t('심볼', 'Symbol') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-left font-normal">{{ t('주문타입', 'Order Type') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-left font-normal">{{ t('포지션', 'Position') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-normal">{{ t('증거금', 'Margin') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-normal">{{ t('레버리지', 'Leverage') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-normal">{{ t('진입가격', 'Entry Price') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-normal">{{ t('계약수량', 'Contract Qty') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-normal">{{ t('청산가격', 'Liq. Price') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-normal">{{ t('수익', 'PnL') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-normal">{{ t('수익률', 'ROE') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-normal">{{ t('수수료', 'Fee') }}</th>
              <th class="border border-white/10 px-2 py-1 whitespace-nowrap text-center font-normal">{{ t('접속확인', 'Status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filteredItems.length === 0" class="">
              <td colspan="15" class="border border-white/10 px-2 py-6 text-center text-slate-500">{{ t('표시할 포지션이 없습니다.', 'No positions to display.') }}</td>
            </tr>
            <tr v-for="row in pagedItems" :key="row.id" class="hover:bg-white/[0.03]">
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap">
                <button type="button" class="font-semibold text-slate-100 underline-offset-4 hover:text-cyan-300 hover:underline" @click="memberInfoModal?.open(row.username)">
                  {{ row.username }}
                </button>
                <div class="mt-0.5 font-data text-[12px] text-slate-500">(#{{ row.user_id }})</div>
              </td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-slate-100">{{ row.name || '—' }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-slate-300">{{ row.affiliate }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap font-semibold text-slate-100">{{ row.symbol }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap">{{ row.orderType }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap">
                <span
                  class="rounded px-2 py-1 text-[13px] font-semibold ring-1"
                  :class="row.position === 'LONG' ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-[#151f35] text-[#60a5fa] ring-[#3b82f6]/30'"
                >
                  {{ row.position }}
                </span>
              </td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-data tabular-nums">{{ fmtNum(row.margin) }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-data tabular-nums">{{ row.leverage }}x</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-data tabular-nums">{{ fmtPrice(row.entryPrice) }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-data tabular-nums">{{ fmtQty(row.qty) }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-data tabular-nums">{{ fmtPrice(row.liqPrice) }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-data-plain tabular-nums" :class="profitClass(row.pnl)">
                {{ signed(row.pnl) }}
              </td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-data-plain tabular-nums" :class="profitClass(row.roe)">
                {{ signed(row.roe, '%') }}
              </td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-right font-data tabular-nums text-slate-300">{{ fmtNum(row.fee) }}</td>
              <td class="border border-white/10 px-2 py-1 whitespace-nowrap text-center">
                <span
                  class="rounded px-2 py-1 text-[12px] font-semibold"
                  :class="row.online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[#2b3445] text-slate-200'"
                >
                  {{ row.online ? t('접속', 'Online') : t('미접속', 'Offline') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-center gap-2" v-if="totalPages > 1">
        <button class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[13px] hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
        <button class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[13px] hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
        <button
          v-for="p in pageNumbers"
          :key="`positions-page-${p}`"
          class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[13px] hover:bg-white/10 text-center"
          :class="p === page ? '!bg-cyan-500/30 text-white' : 'text-slate-300'"
          @click="page = p"
        >
          {{ p }}
        </button>
        <span v-if="showPageTail" class="px-1 text-sm text-slate-500">~</span>
        <button
          v-if="showPageTail"
          class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[13px] hover:bg-white/10 text-center text-slate-300"
          @click="page = totalPages"
        >
          {{ totalPages }}
        </button>
        <button class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[13px] hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
        <button class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[13px] hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>

    <AdminMemberInfoModal ref="memberInfoModal" />
  </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type AdminPositionRow = {
  id: number
  user_id: number
  username: string
  name: string
  affiliate: string
  symbol: string
  orderType: string
  position: 'LONG' | 'SHORT'
  margin: number
  leverage: number
  entryPrice: number
  qty: number
  liqPrice: number
  pnl: number
  roe: number
  fee: number
  online: boolean
  created_at: string
}

const { t, locale } = useLocale()
const { refresh } = useMe()
await refresh()

const memberInfoModal = ref<{ open: (username: string) => void } | null>(null)
const items = ref<AdminPositionRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const memberFilter = ref('')
const symbolFilter = ref('')
const positionFilter = ref('')
const settledFilter = ref('')
const page = ref(1)
const pageSize = 10
const lastUpdated = ref('')
let pollTimer: any = null
let loadingNow = false

const memberOptions = computed(() => Array.from(new Set(items.value.map((r) => r.username))).sort())
const symbolOptions = computed(() => Array.from(new Set(items.value.map((r) => r.symbol))).sort())

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((row) => {
    if (memberFilter.value && row.username !== memberFilter.value) return false
    if (symbolFilter.value && row.symbol !== symbolFilter.value) return false
    if (positionFilter.value && row.position !== positionFilter.value) return false
    if (settledFilter.value === '접속' && !row.online) return false
    if (settledFilter.value === '미접속' && row.online) return false
    if (!q) return true
    return [row.username, row.symbol, row.position, row.affiliate, String(row.user_id)].some((v) => String(v).toLowerCase().includes(q))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize)))
const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredItems.value.slice(start, start + pageSize)
})
const pageNumbers = computed(() => {
  const total = totalPages.value
  const start = Math.floor((page.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showPageTail = computed(() => {
  const nums = pageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < totalPages.value
})
const lastUpdatedText = computed(() => (lastUpdated.value ? t(`실시간 갱신 ${lastUpdated.value}`, `Live update ${lastUpdated.value}`) : t('실시간 갱신 대기', 'Waiting for live update')))

watch(filteredItems, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

// 상단 요약: 지금 표에 보이는(필터 적용) 포지션 기준 총 인원(포지션을 가진 회원 수)과 총 거래금액(진입가 × 계약수량 합계)
const krwPerUsdt = ref(0)
const summary = computed(() => {
  const rows = filteredItems.value
  return {
    members: new Set(rows.map((r) => r.user_id)).size,
    positions: rows.length,
    notionalUsdt: rows.reduce((sum, r) => sum + Number(r.entryPrice || 0) * Number(r.qty || 0), 0)
  }
})
function fmtKrw(usdt: number) {
  const n = Math.round(Number(usdt || 0) * Number(krwPerUsdt.value || 0)).toLocaleString('ko-KR')
  return t(`${n}원`, `${n} KRW`)
}
async function loadRate() {
  try {
    const res = await $fetch<{ rate: number }>('/api/settings/krw-rate')
    krwPerUsdt.value = Number(res.rate || 0)
  } catch {
    // 환율을 못 불러오면 직전 값을 그대로 쓴다.
  }
}

function fmtNum(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtQty(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPrice(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}
function signed(v: number, suffix = '') {
  const n = Number(v || 0)
  return `${n > 0 ? '+' : ''}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`
}
function profitClass(v: number) {
  if (Number(v) > 0) return 'text-emerald-400'
  if (Number(v) < 0) return 'text-blue-400'
  return 'text-slate-300'
}

async function load(silent = false) {
  if (loadingNow) return
  loadingNow = true
  if (!silent) loading.value = true
  try {
    const data = await $fetch<{ items: AdminPositionRow[]; serverTime: string }>('/api/admin/positions', { query: silent ? { p: 1 } : undefined })
    items.value = data.items || []
    lastUpdated.value = new Date().toLocaleTimeString('ko-KR', { hour12: false })
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('포지션 목록을 불러오지 못했습니다.', 'Failed to load position list.')
  } finally {
    loading.value = false
    loadingNow = false
  }
}

onMounted(async () => {
  await Promise.all([load(), loadRate()])
  let tick = 0
  // 화면이 보일 때만 5초마다 갱신
  pollTimer = startVisiblePolling(() => {
    if (++tick % 12 === 0) loadRate().catch(() => {}) // 환율은 1분에 한 번만 다시 불러온다
    return load(true)
  }, 5000)
})

onBeforeUnmount(() => {
  if (pollTimer) pollTimer()
  pollTimer = null
})
</script>

<template>
  <Transition name="member-info-modal">
    <div v-if="isOpen" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4" @click.self="close">
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#12314a] bg-[#03101d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-slate-100">{{ t('회원정보', 'Member Info') }}</h2>
            <p class="mt-1 flex items-center gap-2 text-sm text-slate-400">
              <span>{{ t('아이디', 'Username') }} `{{ username }}`</span>
              <span v-if="detail?.loginLocked" class="rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300">{{ t('접속제한', 'Locked') }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <!-- 회원정보 수정 기록: 총관리자에게만 보인다 -->
            <button
              v-if="isSuperAdmin && detail"
              type="button"
              class="rounded-md px-2.5 py-1.5 text-xs text-slate-200 ring-1 ring-white/15 hover:bg-white/10"
              :class="showHistory ? 'bg-white/15' : ''"
              @click="toggleHistory"
            >
              {{ t('기록', 'History') }}
            </button>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="close">{{ t('닫기', 'Close') }}</button>
          </div>
        </div>

        <!-- 비밀번호 5회 오류로 접속제한된 회원: 총관리자가 비밀번호를 초기화하면 풀린다 -->
        <div v-if="detail?.loginLocked" class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          <span>{{ t('비밀번호 5회 오류로 접속이 제한된 회원입니다.', 'This member is locked after 5 wrong passwords.') }}</span>
          <button
            v-if="isSuperAdmin"
            type="button"
            class="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
            :disabled="unlocking"
            @click="resetAndUnlock"
          >
            {{ unlocking ? t('처리 중...', 'Working...') : t('비밀번호 초기화 (접속제한 해제)', 'Reset password (unlock)') }}
          </button>
        </div>
        <p v-if="unlockMsg" class="mt-2 text-sm text-emerald-300">{{ unlockMsg }}</p>

        <div v-if="showHistory" class="mt-4 max-h-72 overflow-auto rounded-lg border border-white/10">
          <div v-if="historyLoading" class="p-3 text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
          <p v-else-if="historyError" class="p-3 text-sm text-rose-300">{{ historyError }}</p>
          <p v-else-if="!history.length" class="p-3 text-sm text-slate-400">{{ t('수정 기록이 없습니다.', 'No history yet.') }}</p>
          <table v-else class="min-w-full text-xs text-slate-200">
            <thead class="sticky top-0 bg-[#0a1a2a] text-slate-400">
              <tr>
                <th class="px-[10px] py-2 text-left">{{ t('일시', 'Date') }}</th>
                <th class="px-[10px] py-2 text-left">{{ t('수정자', 'By') }}</th>
                <th class="px-[10px] py-2 text-left">{{ t('내용', 'Changes') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in history" :key="h.id" class="border-t border-white/5 align-top">
                <td class="whitespace-nowrap px-[10px] py-2 text-slate-400">{{ fmtDate(h.createdAt) }}</td>
                <td class="whitespace-nowrap px-[10px] py-2">
                  <div class="text-slate-100">{{ h.actorUsername || '-' }}</div>
                  <div class="text-[11px] text-slate-500">{{ sourceLabel(h.source) }}</div>
                </td>
                <td class="px-[10px] py-2">
                  <div v-for="(c, i) in h.changes" :key="i">
                    <span class="text-slate-400">{{ c.label }}:</span>
                    <template v-if="c.before">
                      <span class="text-slate-500 line-through">{{ c.before }}</span>
                      <span class="text-slate-500"> → </span>
                    </template>
                    <span class="text-cyan-200">{{ c.after || t('(비움)', '(empty)') }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="loading" class="mt-6 text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
        <p v-else-if="loadError" class="mt-6 text-sm text-rose-300">{{ loadError }}</p>
        <template v-else-if="detail">
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-sm text-slate-300">{{ t('이름', 'Name') }}</label>
              <input v-model.trim="draft.name" :disabled="!editable" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('생년월일', 'Date of Birth') }}</label>
              <input v-model.trim="draft.birthDate" :disabled="!editable" placeholder="YYYY-MM-DD" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('은행명', 'Bank') }}</label>
              <select v-model="draft.bankName" :disabled="!editable" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-100 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500">
                <option v-for="bank in banks" :key="bank.ko" :value="bank.ko">{{ t(bank.ko, bank.en) }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('은행계좌', 'Account Number') }}</label>
              <input v-model.trim="draft.bankAccount" :disabled="!editable" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('예금주', 'Account Holder') }}</label>
              <input v-model.trim="draft.accountHolder" :disabled="!editable" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">{{ t('추천코드', 'Referral Code') }}</label>
              <input
                v-model.trim="draft.referralCode"
                :disabled="me?.role !== 'super_admin'"
                class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500"
              />
            </div>
          </div>

          <div v-if="editable" class="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              :disabled="saving"
              @click="save"
            >
              {{ saving ? t('저장 중...', 'Saving...') : t('저장', 'Save') }}
            </button>
          </div>
          <p v-if="saveError" class="mt-3 text-sm text-rose-300">{{ saveError }}</p>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
              <div class="text-xs text-slate-400">{{ t('보유잔고', 'Balance') }}</div>
              <div class="mt-1 text-lg font-semibold text-cyan-100">{{ fmt2(detail.balanceUsdt) }} USDT</div>
            </div>
            <div class="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
              <div class="text-xs text-slate-400">{{ t('보유 포지션', 'Positions') }}</div>
              <div class="mt-1 text-lg font-semibold text-cyan-100">{{ t(`${detail.positions.length}건`, `${detail.positions.length}`) }}</div>
            </div>
          </div>

          <div v-if="detail.positions.length" class="mt-3 overflow-auto rounded-lg border border-white/10">
            <table class="min-w-full text-xs text-slate-200">
              <thead class="bg-white/5 text-slate-400">
                <tr>
                  <th class="px-[10px] py-2 text-left">{{ t('심볼', 'Symbol') }}</th>
                  <th class="px-[10px] py-2 text-left">{{ t('구분', 'Side') }}</th>
                  <th class="px-[10px] py-2 text-right">{{ t('레버리지', 'Leverage') }}</th>
                  <th class="px-[10px] py-2 text-right">{{ t('수량', 'Qty') }}</th>
                  <th class="px-[10px] py-2 text-right">{{ t('진입가', 'Entry Price') }}</th>
                  <th class="px-[10px] py-2 text-right">{{ t('증거금', 'Margin') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in detail.positions" :key="p.id" class="border-t border-white/5">
                  <td class="px-[10px] py-2 font-semibold text-slate-100">{{ p.symbol }}</td>
                  <td class="px-[10px] py-2" :class="p.side === 'long' ? 'text-emerald-300' : 'text-rose-300'">{{ p.side === 'long' ? t('롱', 'Long') : t('숏', 'Short') }}</td>
                  <td class="px-[10px] py-2 text-right font-data text-slate-300">x{{ p.leverage }}</td>
                  <td class="px-[10px] py-2 text-right font-data text-slate-300">{{ fmt2(p.qty) }}</td>
                  <td class="px-[10px] py-2 text-right font-data text-slate-300">{{ fmt2(p.entryPrice) }}</td>
                  <td class="px-[10px] py-2 text-right font-data text-slate-300">{{ fmt2(p.margin) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
type MemberDetail = {
  id: number
  username: string
  name: string
  birthDate: string
  bankName: string
  bankAccount: string
  accountHolder: string
  referralCode: string
  role: string
  createdAt: string
  loginLocked?: boolean
  balanceUsdt: number
  positions: Array<{ id: number; symbol: string; side: string; qty: number; entryPrice: number; leverage: number; margin: number }>
}

const emit = defineEmits<{ (e: 'saved'): void }>()

const { t } = useLocale()
const { me } = useMe()

const isOpen = ref(false)
const username = ref('')
const detail = ref<MemberDetail | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)

const draft = reactive({
  name: '',
  birthDate: '',
  bankName: '국민은행',
  bankAccount: '',
  accountHolder: '',
  referralCode: ''
})
const banks = [
  { ko: '국민은행', en: 'KB Kookmin Bank' }, { ko: '신한은행', en: 'Shinhan Bank' }, { ko: '우리은행', en: 'Woori Bank' }, { ko: '하나은행', en: 'Hana Bank' },
  { ko: '농협은행', en: 'NH Nonghyup Bank' }, { ko: '기업은행', en: 'IBK Industrial Bank' }, { ko: '카카오뱅크', en: 'Kakao Bank' }, { ko: '토스뱅크', en: 'Toss Bank' },
  { ko: '케이뱅크', en: 'K Bank' }, { ko: '새마을금고', en: 'MG Community Credit Coop' }, { ko: '수협은행', en: 'Suhyup Bank' }, { ko: 'SC제일은행', en: 'SC First Bank' },
  { ko: '씨티은행', en: 'Citibank Korea' }, { ko: '부산은행', en: 'Busan Bank' }, { ko: '대구은행', en: 'Daegu Bank' }, { ko: '경남은행', en: 'Kyongnam Bank' },
  { ko: '광주은행', en: 'Gwangju Bank' }, { ko: '전북은행', en: 'Jeonbuk Bank' }, { ko: '제주은행', en: 'Jeju Bank' }, { ko: '우체국', en: 'Korea Post Office' }
]

// 총관리자는 항상 수정 가능, 부관리자는 "회원 목록" 수정 권한이 있을 때만
const editable = computed(() => {
  if (me.value?.role === 'super_admin') return true
  if (me.value?.role && me.value.role !== 'user') return Boolean((me.value as any)?.permissions?.menus?.members?.edit)
  return false
})

function fmt2(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function open(uname: string) {
  username.value = uname
  isOpen.value = true
  detail.value = null
  loadError.value = null
  saveError.value = null
  showHistory.value = false
  history.value = []
  unlockMsg.value = null
  loading.value = true
  try {
    const res = await $fetch<MemberDetail>('/api/admin/member-detail', { query: { username: uname } })
    detail.value = res
    draft.name = res.name
    draft.birthDate = res.birthDate
    draft.bankName = res.bankName || banks[0].ko
    draft.bankAccount = res.bankAccount
    draft.accountHolder = res.accountHolder
    draft.referralCode = res.referralCode
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || t('회원정보를 불러오지 못했습니다.', 'Failed to load member info.')
  } finally {
    loading.value = false
  }
}

function close() {
  isOpen.value = false
}

// ---- 회원정보 수정 기록(총관리자 전용) ----
type HistoryRow = { id: number; actorUsername: string; actorRole: string; source: string; changes: Array<{ label: string; before: string; after: string }>; createdAt: string }
const isSuperAdmin = computed(() => me.value?.role === 'super_admin')
const showHistory = ref(false)
const history = ref<HistoryRow[]>([])
const historyLoading = ref(false)
const historyError = ref<string | null>(null)

async function loadHistory() {
  if (!detail.value) return
  historyLoading.value = true
  historyError.value = null
  try {
    const res = await $fetch<{ items: HistoryRow[] }>('/api/admin/users/profile-history', { query: { userId: detail.value.id } })
    history.value = res.items || []
  } catch (e: any) {
    historyError.value = e?.data?.statusMessage || t('기록을 불러오지 못했습니다.', 'Failed to load history.')
  } finally {
    historyLoading.value = false
  }
}

function toggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value) loadHistory()
}

function sourceLabel(source: string) {
  if (source === 'member_profile') return t('회원 · 회원정보수정', 'Member · Profile')
  if (source === 'member_wallet') return t('회원 · 내 지갑', 'Member · Wallet')
  if (source === 'admin') return t('관리자', 'Admin')
  if (source === 'system') return t('자동', 'System')
  return source
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// ---- 접속제한 해제(= 비밀번호를 아이디와 같게 초기화) ----
const unlocking = ref(false)
const unlockMsg = ref<string | null>(null)

async function resetAndUnlock() {
  if (!detail.value) return
  if (process.client && !window.confirm(t('이 회원의 비밀번호를 아이디와 동일하게 초기화하고 접속제한을 해제할까요?', "Reset this member's password to the username and unlock?"))) return
  unlocking.value = true
  unlockMsg.value = null
  try {
    await $fetch('/api/admin/users/reset-password', { method: 'POST', body: { userId: detail.value.id } })
    detail.value = { ...detail.value, loginLocked: false }
    unlockMsg.value = t('비밀번호가 아이디와 동일하게 초기화되고 접속제한이 해제되었습니다.', 'Password reset to the username and account unlocked.')
    if (showHistory.value) loadHistory()
  } catch (e: any) {
    unlockMsg.value = null
    saveError.value = e?.data?.statusMessage || t('초기화 실패', 'Reset failed')
  } finally {
    unlocking.value = false
  }
}

async function save() {
  if (!detail.value) return
  saving.value = true
  saveError.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: {
        userId: detail.value.id,
        name: draft.name,
        birthDate: draft.birthDate,
        bankName: draft.bankName,
        bankAccount: draft.bankAccount,
        accountHolder: draft.accountHolder,
        ...(me.value?.role === 'super_admin' ? { referralCode: draft.referralCode } : {})
      }
    })
    emit('saved')
    close()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || t('회원정보 저장에 실패했습니다.', 'Failed to save member info.')
  } finally {
    saving.value = false
  }
}

defineExpose({ open, isOpen })
</script>

<style scoped>
.member-info-modal-enter-active,
.member-info-modal-leave-active {
  transition: opacity 0.15s ease;
}
.member-info-modal-enter-from,
.member-info-modal-leave-to {
  opacity: 0;
}
</style>

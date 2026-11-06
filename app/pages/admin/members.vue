<template>
  <!-- 회원 목록 — 설정 > 유저관리2(디자인 F · 표 격자형)와 같은 모양: 표 폭에 맞춘 한 덩어리를 화면 가운데에 -->
  <div class="lg:mx-[calc(24px_-_21.42857%)]">
    <div class="mx-auto w-fit max-w-full space-y-2">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h1 class="text-base font-semibold text-slate-100">{{ t('회원 목록', 'Members') }}</h1>
        <div class="flex items-center gap-3 text-[13px]">
          <span class="text-slate-400">{{ t('총 회원수', 'Total') }} <span class="font-mono text-slate-100">{{ filtered.length }}</span>{{ t('명', '') }}</span>
          <span class="text-slate-400">{{ t('총 보유금액', 'Total Balance') }} <span class="font-mono text-slate-100">{{ fmtBal(totalBalance) }}</span></span>
          <button type="button" class="border border-white/20 bg-white/[0.06] px-3 py-1 text-slate-100 hover:bg-white/10" @click="load(true)">↻ {{ t('새로고침', 'Refresh') }}</button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-[13px]">
        <div class="flex items-center gap-2 border border-white/15 px-2 py-1">
          <AdminDateInput v-model="fromDate" class="w-32" />
          <span class="text-slate-500">~</span>
          <AdminDateInput v-model="toDate" class="w-32" />
        </div>
        <select v-model="roleFilter" class="border border-white/15 bg-[#06101b] px-2 py-1 outline-none focus:border-cyan-400">
          <option value="">{{ t('유저역할', 'User Role') }}</option>
          <option value="user">{{ t('회원', 'Member') }}</option>
          <option value="admin">{{ t('부관리자', 'Sub Admin') }}</option>
          <option value="super_admin">{{ t('관리자', 'Admin') }}</option>
        </select>
        <input v-model.trim="keyword" class="w-56 border border-white/15 bg-transparent px-2 py-1 outline-none placeholder:text-slate-600 focus:border-cyan-400" :placeholder="t('검색어를 입력하세요', 'Enter a search term')" :key="`members-search-${locale}`" />
        <select v-model="onlineFilter" class="border border-white/15 bg-[#06101b] px-2 py-1 outline-none focus:border-cyan-400">
          <option value="">{{ t('접속여부', 'Status') }}</option>
          <option value="접속">{{ t('접속', 'Online') }}</option>
          <option value="미접속">{{ t('미접속', 'Offline') }}</option>
        </select>
        <span class="text-slate-400">{{ t('표시수', 'Rows') }}</span>
        <input v-model.number="pageSizeInput" type="number" min="1" max="500" class="w-16 border border-white/15 bg-transparent px-2 py-1 text-right outline-none focus:border-cyan-400" />
      </div>

      <div class="overflow-x-auto">
        <table class="w-auto border-collapse text-[14px] text-slate-200">
          <thead class="bg-white/[0.04] text-left text-slate-400">
            <tr>
              <th class="w-10 whitespace-nowrap border border-white/10 px-2 py-1 text-center font-normal">#</th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 font-normal" @click="toggleSort('role')">{{ t('유저역할', 'Role') }}<span class="sort-icon">{{ sortArrow('role') || ' ⇅' }}</span></th>
              <th class="whitespace-nowrap border border-white/10 px-2 py-1 font-normal">{{ t('승인상태', 'Approval') }}</th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 font-normal" @click="toggleSort('username')">{{ t('아이디', 'Username') }}<span class="sort-icon">{{ sortArrow('username') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 font-normal" @click="toggleSort('name')">{{ t('회원이름', 'Name') }}<span class="sort-icon">{{ sortArrow('name') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 font-normal" @click="toggleSort('referralCode')">{{ t('추천코드', 'Referral') }}<span class="sort-icon">{{ sortArrow('referralCode') || ' ⇅' }}</span></th>
              <th v-if="showTopCode" class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 font-normal" @click="toggleSort('topCode')">{{ t('최상위코드', 'Top Code') }}<span class="sort-icon">{{ sortArrow('topCode') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 text-right font-normal" @click="toggleSort('balanceUsdt')">{{ t('보유금액', 'Balance') }}<span class="sort-icon">{{ sortArrow('balanceUsdt') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 text-right font-normal" @click="toggleSort('totalDepositKrw')">{{ t('총 입금액', 'Deposits') }}<span class="sort-icon">{{ sortArrow('totalDepositKrw') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 text-right font-normal" @click="toggleSort('totalWithdrawKrw')">{{ t('총 출금액', 'Withdrawals') }}<span class="sort-icon">{{ sortArrow('totalWithdrawKrw') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 text-right font-normal" @click="toggleSort('cumulativeProfit')">{{ t('누적수익', 'Cum. PnL') }}<span class="sort-icon">{{ sortArrow('cumulativeProfit') || ' ⇅' }}</span></th>
              <th class="whitespace-nowrap border border-white/10 px-2 py-1 font-normal">{{ t('거래내역', 'Trades') }}</th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 font-normal" @click="toggleSort('created_at')">{{ t('가입일', 'Joined') }}<span class="sort-icon">{{ sortArrow('created_at') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 font-normal" @click="toggleSort('last_login')">{{ t('최근 접속일', 'Last Login') }}<span class="sort-icon">{{ sortArrow('last_login') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap border border-white/10 px-2 py-1 font-normal" @click="toggleSort('online')">{{ t('접속여부', 'Status') }}<span class="sort-icon">{{ sortArrow('online') || ' ⇅' }}</span></th>
              <th class="whitespace-nowrap border border-white/10 px-2 py-1 font-normal">{{ t('차단', 'Block') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0">
              <td colspan="16" class="border border-white/10 px-2 py-6 text-center text-slate-500">{{ t('데이터가 없습니다.', 'No data available.') }}</td>
            </tr>
            <tr v-for="(u, ui) in paged" :key="u.id" class="hover:bg-white/[0.03]">
              <td class="border border-white/10 px-2 py-1 text-center font-mono text-slate-500">{{ (page - 1) * pageSize + ui + 1 }}</td>
              <td class="border border-white/10 p-0">
                <select
                  v-if="canEditRoleOf(u)"
                  v-model="roleDraft[u.id]"
                  class="w-28 bg-transparent px-2 py-1 text-slate-100 outline-none focus:bg-black/40 [&>option]:bg-[#0b1726]"
                  :disabled="grantingId === u.id"
                  @change="onRoleSelectChange(u)"
                >
                  <option value="user">{{ t('회원', 'Member') }}</option>
                  <option v-for="r in grantableRoles" :key="r.id" :value="r.id">{{ r.label }}</option>
                </select>
                <span v-else class="block px-2 py-1 text-slate-100">{{ u.role }}</span>
              </td>
              <!-- 승인상태: 버튼 하나(지금 상태가 색으로 표시) — 누르면 승인 / 거절 / 대기 중 하나를 고른다 -->
              <td class="whitespace-nowrap border border-white/10 px-2 py-1">
                <template v-if="canEditBalance && u.roleId !== 'super_admin'">
                  <select
                    :value="u.approvalStatus || 'approved'"
                    class="cursor-pointer border px-2 py-0.5 text-[12px] outline-none disabled:opacity-40 [&>option]:bg-[#0b1726] [&>option]:text-slate-100"
                    :class="(APPROVAL_OPTIONS.find((o) => o.key === (u.approvalStatus || 'approved')) || APPROVAL_OPTIONS[0]).on"
                    :disabled="approvalSavingId === u.id"
                    @change="setApproval(u, ($event.target as HTMLSelectElement).value as any)"
                  >
                    <option v-for="st in APPROVAL_OPTIONS" :key="st.key" :value="st.key">{{ t(st.ko, st.en) }}</option>
                  </select>
                </template>
                <span v-else :class="approvalText(u.approvalStatus).cls">{{ t(approvalText(u.approvalStatus).ko, approvalText(u.approvalStatus).en) }}</span>
              </td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 font-mono text-slate-100">
                <button type="button" class="underline-offset-4 hover:text-cyan-300 hover:underline" @click="memberInfoModal?.open(u.username)">{{ u.username }}</button>
              </td>
              <!-- 회원이름·추천코드·보유금액: 더블클릭하면 그 자리에서 바로 수정(Enter/다른 곳 클릭 = 저장, Esc = 취소) -->
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 text-slate-200" :class="canEditCell(u, 'name') ? 'cursor-text' : ''" @dblclick="startEdit(u, 'name', $event)">
                <input
                  v-if="isEditing(u, 'name')"
                  :ref="setEditInput"
                  :value="editValue"
                  size="1" :style="editInputStyle" class="m-0 block bg-black/50 p-0 leading-[inherit] text-white outline-none ring-1 ring-inset ring-cyan-400"
                  @input="onEditInput"
                  @keydown.enter.prevent="commitEdit(u)"
                  @keydown.esc.prevent="cancelEdit"
                  @blur="commitEdit(u)"
                />
                <template v-else>{{ u.name || '—' }}</template>
              </td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 font-mono text-slate-300" :class="canEditCell(u, 'referralCode') ? 'cursor-text' : ''" @dblclick="startEdit(u, 'referralCode', $event)">
                <input
                  v-if="isEditing(u, 'referralCode')"
                  :ref="setEditInput"
                  :value="editValue"
                  size="1" :style="editInputStyle" class="m-0 block bg-black/50 p-0 font-mono leading-[inherit] text-white outline-none ring-1 ring-inset ring-cyan-400"
                  @input="onEditInput"
                  @keydown.enter.prevent="commitEdit(u)"
                  @keydown.esc.prevent="cancelEdit"
                  @blur="commitEdit(u)"
                />
                <template v-else>{{ u.referralCode || '—' }}</template>
              </td>
              <td v-if="showTopCode" class="whitespace-nowrap border border-white/10 px-2 py-1 font-mono text-slate-500">{{ u.topCode || '—' }}</td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 text-right font-mono text-slate-200" :class="canEditCell(u, 'balance') ? 'cursor-text' : ''" @dblclick="startEdit(u, 'balance', $event)">
                <input
                  v-if="isEditing(u, 'balance')"
                  :ref="setEditInput"
                  :value="editValue"
                  inputmode="numeric"
                  size="1" :style="editInputStyle" class="m-0 block bg-black/50 p-0 text-right font-mono leading-[inherit] text-white outline-none ring-1 ring-inset ring-cyan-400"
                  @input="onEditInput"
                  @keydown.enter.prevent="commitEdit(u)"
                  @keydown.esc.prevent="cancelEdit"
                  @blur="commitEdit(u)"
                />
                <template v-else>{{ fmtBal(u.balanceUsdt) }}</template>
              </td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 text-right font-mono text-slate-200">{{ isStaff(u) ? '-' : fmtKrw(u.totalDepositKrw) }}</td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 text-right font-mono text-slate-200">{{ isStaff(u) ? '-' : fmtKrw(u.totalWithdrawKrw) }}</td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 text-right font-mono">
                <span v-if="isStaff(u)" class="text-slate-200">-</span>
                <span v-else :class="u.cumulativeProfit >= 0 ? 'text-rose-300' : 'text-sky-300'">{{ signedProfitKrw(u.cumulativeProfit) }}</span>
              </td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 text-center">
                <span v-if="isStaff(u)" class="text-slate-600">—</span>
                <button v-else type="button" class="border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[12px] hover:bg-white/10" @click="openTradeModal(u)">{{ t('거래내역', 'Trades') }}</button>
              </td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 font-mono text-slate-400">{{ dateOnly(u.created_at) }}</td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 font-mono text-slate-400">{{ u.last_login ? dateOnly(u.last_login) : '—' }}</td>
              <td class="whitespace-nowrap border border-white/10 px-2 py-1" :class="u.online ? 'text-[#22ab94]' : 'text-slate-500'">
                {{ u.online ? t('● 접속', '● Online') : t('○ 미접속', '○ Offline') }}
              </td>
              <!-- 차단: 승인상태를 거절로 바꾼다(접속 중이면 5초 안에 자동 로그아웃) -->
              <td class="whitespace-nowrap border border-white/10 px-2 py-1 text-center">
                <span v-if="!canEditBalance || u.roleId === 'super_admin'" class="text-slate-600">—</span>
                <span v-else-if="u.approvalStatus === 'rejected'" class="text-[12px] text-rose-300">{{ t('차단됨', 'Blocked') }}</span>
                <button
                  v-else
                  type="button"
                  class="border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 text-[12px] text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
                  :disabled="approvalSavingId === u.id"
                  @click="blockMember(u)"
                >
                  {{ t('차단', 'Block') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-3 text-[13px]">
        <div class="text-slate-400">{{ t(`페이지 ${page} / ${totalPages} · 총 ${filtered.length}명`, `Page ${page} / ${totalPages} · ${filtered.length} total`) }}</div>
        <div v-if="totalPages > 1" class="flex items-center gap-1">
          <button type="button" class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
          <button type="button" class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
          <button
            v-for="p in pageNumbers"
            :key="`member-page-${p}`"
            type="button"
            class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 hover:bg-white/10"
            :class="p === page ? '!bg-cyan-500/30 text-white' : ''"
            @click="page = p"
          >
            {{ p }}
          </button>
          <span v-if="showPageTail" class="px-1 text-slate-500">~</span>
          <button v-if="showPageTail" type="button" class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 hover:bg-white/10" @click="page = totalPages">{{ totalPages }}</button>
          <button type="button" class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
          <button type="button" class="min-w-7 border border-white/20 bg-white/[0.06] px-2 py-0.5 hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
        </div>
      </div>
      <p v-if="error" class="text-[13px] text-rose-300">{{ error }}</p>
      <p v-if="approvalError" class="text-[13px] text-rose-300">{{ approvalError }}</p>
    </div>

    <AdminMemberInfoModal ref="memberInfoModal" @saved="load(true)" />

    <Transition name="member-modal">
      <div v-if="tradeModalOpen && selectedMember" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4" @click.self="closeTradeModal">
        <div class="flex max-h-[88vh] w-full max-w-6xl flex-col rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">{{ t(`${selectedMember.name} 거래내역`, `${selectedMember.name} Trade History`) }}</h2>
              <p class="mt-1 text-sm text-slate-400">
                {{ t('아이디', 'Username') }} `{{ selectedMember.username }}` · {{ t('현재 보유금액', 'Current Balance') }} {{ fmtBal(selectedMember.balanceUsdt) }}
              </p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeTradeModal">{{ t('닫기', 'Close') }}</button>
          </div>

          <div class="mt-4 min-h-0 flex-1 overflow-auto">
            <table class="min-w-full text-xs text-slate-200">
              <thead class="border-b border-[#12314a] text-[12px] text-slate-400">
                <tr>
                  <th class="px-[10px] py-3 text-left">{{ t('날짜', 'Date') }}</th>
                  <th class="px-[10px] py-3 text-left">{{ t('심볼', 'Symbol') }}</th>
                  <th class="px-[10px] py-3 text-left">{{ t('주문유형', 'Order Type') }}</th>
                  <th class="px-[10px] py-3 text-left">{{ t('구분', 'Result') }}</th>
                  <th class="px-[10px] py-3 text-right">{{ t('레버리지', 'Leverage') }}</th>
                  <th class="px-[10px] py-3 text-right">{{ t('체결가격', 'Fill Price') }}</th>
                  <th class="px-[10px] py-3 text-right">{{ t('체결량', 'Fill Qty') }}</th>
                  <th class="px-[10px] py-3 text-right">{{ t('실현손익', 'Realized PnL') }}</th>
                  <th class="px-[10px] py-3 text-right">{{ t('수수료', 'Fee') }}</th>
                  <th class="px-[10px] py-3 text-left">{{ t('접속상태', 'Status') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!tradeLoading && pagedMemberTrades.length === 0" class="border-b border-[#0d2438]">
                  <td colspan="10" class="px-[10px] py-8 text-center text-slate-500">{{ t('거래 내역이 없습니다.', 'No trade history available.') }}</td>
                </tr>
                <tr v-for="tr in pagedMemberTrades" :key="tr.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
                  <td class="px-[10px] py-3 font-data text-slate-300">{{ formatDateTime(tr.created_at) }}</td>
                  <td class="px-[10px] py-3 font-semibold text-slate-100">{{ tr.symbol }}</td>
                  <td class="px-[10px] py-3 text-slate-200">{{ tr.orderType }}</td>
                  <td class="px-[10px] py-3">
                    <span class="rounded px-2 py-1 text-[12px] font-semibold ring-1" :class="tradeResultBadgeClass(tr)">
                      {{ tradeResultLabel(tr) }}
                    </span>
                  </td>
                  <td class="px-[10px] py-3 text-right font-data text-slate-300">x{{ tr.leverage }}</td>
                  <td class="px-[10px] py-3 text-right font-data text-slate-200">{{ fmtPrice(tr.price) }}</td>
                  <td class="px-[10px] py-3 text-right font-data text-slate-200">{{ fmt2(tr.qty) }}</td>
                  <td class="px-[10px] py-3 text-right font-data-plain" :class="tr.pnl >= 0 ? 'text-emerald-400' : 'text-blue-400'">
                    {{ tr.pnl >= 0 ? '+' : '' }}{{ fmt2(tr.pnl) }}
                  </td>
                  <td class="px-[10px] py-3 text-right font-data text-slate-300">{{ fmt2(tr.fee) }}</td>
                  <td class="px-[10px] py-3">
                    <span
                      class="rounded px-2 py-1 text-[12px] font-semibold ring-1"
                      :class="tr.online ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-white/5 text-slate-300 ring-white/10'"
                    >
                      {{ tr.online ? t('실시간 접속중', 'Live') : t('미접속중', 'Offline') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex items-center justify-center gap-2" v-if="memberTradeTotalPages > 1">
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage <= 1"
              @click="memberTradePage = 1"
            >
              «
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage <= 1"
              @click="memberTradePage--"
            >
              ‹
            </button>
            <button
              v-for="p in memberTradePageNumbers"
              :key="`member-trade-page-${p}`"
              class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
              :class="p === memberTradePage ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
              @click="memberTradePage = p"
            >
              {{ p }}
            </button>
            <span v-if="showMemberTradeTail" class="px-1 text-sm text-slate-500">~</span>
            <button
              v-if="showMemberTradeTail"
              class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10"
              @click="memberTradePage = memberTradeTotalPages"
            >
              {{ memberTradeTotalPages }}
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage >= memberTradeTotalPages"
              @click="memberTradePage++"
            >
              ›
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage >= memberTradeTotalPages"
              @click="memberTradePage = memberTradeTotalPages"
            >
              »
            </button>
          </div>
          <p v-if="tradeError" class="mt-3 text-sm text-rose-300">{{ tradeError }}</p>
        </div>
      </div>
    </Transition>

    <Transition name="member-modal">
      <div v-if="balanceModalOpen && selectedMember" class="fixed inset-0 z-[81] flex items-center justify-center bg-black/60 px-4" @click.self="closeBalanceModal">
        <div class="w-full max-w-md rounded-2xl border border-[#12314a] bg-[#03101d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">{{ t(`${selectedMember.name} 보유금액 수정`, `Edit ${selectedMember.name} Balance`) }}</h2>
              <p class="mt-1 text-sm text-slate-400">
                {{ balanceInKrw ? t('현재 보유금액을 원화로 직접 수정합니다.', 'Directly edit the current balance in KRW.') : t('현재 보유 현금 USDT를 직접 수정합니다.', 'Directly edit the current USDT cash balance.') }}
              </p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeBalanceModal">{{ t('닫기', 'Close') }}</button>
          </div>

          <div class="mt-4">
            <template v-if="balanceInKrw">
              <label class="text-sm text-slate-300">{{ t('보유금액 (원)', 'Balance (KRW)') }}</label>
              <div class="mt-2 flex items-center rounded-md border border-[#173753] bg-[#041425] px-3 py-2">
                <input
                  :value="balanceKrwText"
                  type="text"
                  inputmode="numeric"
                  class="w-full bg-transparent text-right text-sm text-slate-100 outline-none"
                  :disabled="!canEditBalance || balanceSaving"
                  @input="onBalanceKrwInput"
                  @keydown.enter="saveBalance"
                />
                <span class="ml-2 text-sm text-slate-400">{{ t('원', 'KRW') }}</span>
              </div>
              <p class="mt-2 text-xs text-slate-500">
                ≈ {{ fmt2(balanceKrwNumber / krwPerUsdt) }} USDT · {{ t('환율', 'Rate') }} {{ krwPerUsdt.toLocaleString('ko-KR') }}{{ t('원', ' KRW') }}/USDT
              </p>
            </template>
            <template v-else>
            <label class="text-sm text-slate-300">{{ t('보유금액 (USDT)', 'Balance (USDT)') }}</label>
            <input
              v-model.number="balanceDraft"
              type="number"
              min="0"
              step="0.01"
              class="mt-2 w-full rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-100 outline-none"
              :disabled="!canEditBalance || balanceSaving"
            />
            </template>
          </div>

          <p v-if="balanceError" class="mt-3 text-sm text-rose-300">{{ balanceError }}</p>

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="rounded-md bg-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeBalanceModal">
              {{ t('취소', 'Cancel') }}
            </button>
            <button
              type="button"
              class="rounded-md bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-40"
              :disabled="!canEditBalance || balanceSaving"
              @click="saveBalance"
            >
              {{ t('수정', 'Save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })
const { t, locale } = useLocale()

type MemberRow = {
  id: number
  role: string
  roleId: string
  approved: boolean
  approvalStatus?: 'approved' | 'pending' | 'rejected' | string
  username: string
  name: string
  birthDate: string
  bankName: string
  bankAccount: string
  accountHolder: string
  referralCode: string
  topCode: string
  balanceUsdt: number
  totalDepositKrw: number
  totalWithdrawKrw: number
  cumulativeProfit: number
  created_at: string
  online: boolean
  last_ip: string | null
  last_login: string | null
}

type MemberTradeRow = {
  id: number
  created_at: string
  symbol: string
  orderType: string
  leverage: number
  price: number
  qty: number
  pnl: number
  fee: number
  online: boolean
  liquidation?: boolean
}

const { me, refresh } = useMe()
await refresh()

const items = ref<MemberRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const roleFilter = ref('')
const onlineFilter = ref('')
const DEFAULT_FROM_DATE = '2026-01-01'
const DEFAULT_TO_DATE = new Date().toISOString().slice(0, 10)
const fromDate = ref(DEFAULT_FROM_DATE)
const toDate = ref(DEFAULT_TO_DATE)
const page = ref(1)
const pageSizeInput = ref(20)
const tradeModalOpen = ref(false)
const balanceModalOpen = ref(false)
const memberInfoModal = ref<{ open: (username: string) => void; isOpen: boolean } | null>(null)
const selectedMember = ref<MemberRow | null>(null)
const memberTrades = ref<MemberTradeRow[]>([])
const tradeLoading = ref(false)
const tradeError = ref<string | null>(null)
const memberTradePage = ref(1)
const memberTradePageSize = 10
const balanceDraft = ref(0)
const balanceSaving = ref(false)
const balanceError = ref<string | null>(null)
let pollTimer: any = null
let loadingNow = false
// 최상위코드는 기본으로 숨김, 총관리자(admin)는 항상 보이고 부관리자는 역할 권한의 "최상위코드 보이기"가 켜져 있을 때만 보인다.
const showTopCode = computed(() => me.value?.role === 'super_admin' || (me.value as any)?.permissions?.menus?.members?.showTopCode === true)
// 총관리자는 항상 가능, 부관리자는 총관리자가 부여한 "회원 목록" 수정 권한이 있을 때만
// ── 가입 승인상태(승인 / 거절 / 대기) ──
const APPROVAL_OPTIONS = [
  { key: 'approved', ko: '승인', en: 'Approved', on: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200' },
  { key: 'rejected', ko: '거절', en: 'Rejected', on: 'border-rose-400/60 bg-rose-500/20 text-rose-200' },
  { key: 'pending', ko: '대기', en: 'Pending', on: 'border-amber-400/60 bg-amber-500/20 text-amber-200' }
] as const
function approvalText(st?: string) {
  if (st === 'pending') return { ko: '대기', en: 'Pending', cls: 'text-amber-300' }
  if (st === 'rejected') return { ko: '거절', en: 'Rejected', cls: 'text-rose-300' }
  return { ko: '승인', en: 'Approved', cls: 'text-emerald-300' }
}
const approvalSavingId = ref<number | null>(null)

// ── 표에서 바로 고치기(더블클릭): 회원이름 / 추천코드 / 보유금액(원화로 입력 → 현재 환율로 USDT 저장) ──
type EditField = 'name' | 'referralCode' | 'balance'
const editCell = ref<{ id: number; field: EditField } | null>(null)
const editValue = ref('')
let editInitial = ''
let editSaving = false
let editInputEl: HTMLInputElement | null = null
function setEditInput(el: any) {
  if (el) editInputEl = el as HTMLInputElement
}
function canEditCell(u: MemberRow, field: EditField) {
  if (!canEditBalance.value) return false
  if (field === 'referralCode') return me.value?.role === 'super_admin' && u.roleId !== 'super_admin'
  if (field === 'name') return u.roleId !== 'super_admin'
  return true
}
function isEditing(u: MemberRow, field: EditField) {
  return editCell.value?.id === u.id && editCell.value?.field === field
}
function balanceEditText(usdt: number) {
  if (krwPerUsdt.value > 0) return Math.round(Number(usdt || 0) * krwPerUsdt.value).toLocaleString('ko-KR')
  return String(Number(usdt || 0))
}
// 수정칸은 원래 칸의 글자 영역과 똑같은 크기로 그린다(더블클릭해도 칸 크기가 바뀌지 않게)
const editInputStyle = ref<Record<string, string>>({})
function startEdit(u: MemberRow, field: EditField, e?: MouseEvent) {
  if (!canEditCell(u, field)) return
  const td = e?.currentTarget as HTMLElement | undefined
  if (td) {
    const cs = getComputedStyle(td)
    const w = td.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0')
    const h = td.clientHeight - parseFloat(cs.paddingTop || '0') - parseFloat(cs.paddingBottom || '0')
    editInputStyle.value = { width: `${Math.max(20, w)}px`, height: `${Math.max(14, h)}px`, font: 'inherit' }
  }
  editCell.value = { id: u.id, field }
  editValue.value = field === 'balance' ? balanceEditText(u.balanceUsdt) : String((u as any)[field] || '')
  editInitial = editValue.value
  // 바로 입력 커서가 깜박이게(글자 끝에 커서)
  nextTick(() => {
    const el = editInputEl
    if (!el) return
    el.focus()
    const n = el.value.length
    el.setSelectionRange(n, n)
  })
}
function onEditInput(e: Event) {
  const el = e.target as HTMLInputElement
  if (editCell.value?.field === 'balance' && krwPerUsdt.value > 0) {
    const digits = el.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
    editValue.value = digits ? Number(digits).toLocaleString('ko-KR') : ''
    el.value = editValue.value
  } else {
    editValue.value = el.value
  }
}
function cancelEdit() {
  editCell.value = null
}
async function commitEdit(u: MemberRow) {
  const cell = editCell.value
  if (!cell || cell.id !== u.id || editSaving) return
  const value = editValue.value.trim()
  if (value === editInitial.trim()) {
    editCell.value = null
    return
  }
  editSaving = true
  error.value = null
  try {
    const body: Record<string, any> = { userId: u.id }
    if (cell.field === 'name') body.name = value
    else if (cell.field === 'referralCode') body.referralCode = value
    else {
      if (!value) throw new Error(t('금액을 입력하세요.', 'Enter an amount.'))
      const usdt = krwPerUsdt.value > 0 ? Number(value.replace(/[^\d]/g, '')) / krwPerUsdt.value : Number(value)
      if (!Number.isFinite(usdt) || usdt < 0) throw new Error(t('0 이상 금액만 입력할 수 있습니다.', 'Only amounts of 0 or more.'))
      body.usdt = usdt
    }
    await $fetch('/api/admin/users/update', { method: 'POST', body })
    if (cell.field === 'name') u.name = value
    else if (cell.field === 'referralCode') u.referralCode = value
    else u.balanceUsdt = body.usdt
    editCell.value = null
    load(true).catch(() => {})
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || t('저장에 실패했습니다.', 'Failed to save.')
    editCell.value = null
  } finally {
    editSaving = false
  }
}
// 차단 = 승인상태를 거절로. 서버가 그 회원의 로그인을 끊어서, 접속 중이면 회원 화면이 5초 안에 로그아웃된다.
async function blockMember(u: MemberRow) {
  if (process.client && !window.confirm(t(`${u.username} 회원을 차단할까요? (승인상태가 거절로 바뀌고, 접속 중이면 5초 안에 로그아웃됩니다)`, `Block ${u.username}? (Approval becomes rejected; if online they are logged out within 5 seconds)`))) return
  await setApproval(u, 'rejected')
}
const approvalError = ref<string | null>(null)
async function setApproval(u: MemberRow, status: 'approved' | 'rejected' | 'pending') {
  if ((u.approvalStatus || 'approved') === status || approvalSavingId.value) return
  approvalSavingId.value = u.id
  approvalError.value = null
  const prev = u.approvalStatus
  u.approvalStatus = status
  try {
    await $fetch('/api/admin/members/approval', { method: 'POST', body: { userId: u.id, status } })
  } catch (e: any) {
    u.approvalStatus = prev
    approvalError.value = e?.data?.statusMessage || t('승인상태를 바꾸지 못했습니다.', 'Failed to change approval.')
  } finally {
    approvalSavingId.value = null
  }
}

const canEditBalance = computed(() => {
  if (me.value?.role === 'super_admin') return true
  if (me.value?.role && me.value.role !== 'user') return Boolean((me.value as any)?.permissions?.menus?.members?.edit)
  return false
})
const autoRefreshPaused = computed(() => tradeModalOpen.value || balanceModalOpen.value || Boolean(memberInfoModal.value?.isOpen))

// 영업 조직 구조: "코드부여"(승격)는 총관리자는 누구에게나,
// 부관리자는 자기 코드로 가입한 직속 하부에게만 할 수 있다.
function isDirectChildOfMe(u: MemberRow) {
  if (!me.value) return false
  if (me.value.role === 'super_admin') return true
  if (me.value.role !== 'user') return u.referralCode.trim() === me.value.username
  return false
}

const roleDraft = reactive<Record<number, string>>({})
const grantingId = ref<number | null>(null)

// 역할 변경: 유저 및 권한 관리 화면과 동일하게, 드롭다운에서 바로 고르면 즉시 저장된다.
// 드롭다운에는 내가 실제로 부여할 수 있는(나보다 서열이 낮은) 역할만 나온다.
// 최고관리자(super_admin) 계정은 사고 방지를 위해 이 화면에서 역할을 바꿀 수 없다.
type RoleOption = { id: string; label: string }
const grantableRoles = ref<RoleOption[]>([])

function canEditRoleOf(u: MemberRow) {
  // 회원역할수정허용 권한이 꺼진 부관리자는 역할을 바꿀 수 없다(총관리자는 항상 가능).
  const roleEditAllowed = me.value?.role === 'super_admin' || (me.value as any)?.permissions?.menus?.members?.roleEdit !== false
  return roleEditAllowed && isDirectChildOfMe(u) && u.roleId !== 'super_admin' && grantableRoles.value.length > 0
}

async function loadRoles() {
  try {
    const data = await $fetch<{ grantableRoles: RoleOption[] }>('/api/admin/roles')
    grantableRoles.value = data.grantableRoles || []
  } catch {
    grantableRoles.value = []
  }
}

async function onRoleSelectChange(u: MemberRow) {
  const roleId = roleDraft[u.id]
  const prevRoleId = u.roleId
  if (!roleId || roleId === prevRoleId) return
  const roleLabel =
    roleId === 'user' ? t('회원', 'Member') : roleId === 'super_admin' ? t('최고관리자', 'Super Admin') : grantableRoles.value.find((r) => r.id === roleId)?.label || roleId
  if (process.client && !window.confirm(t(`${u.username} 님의 역할을 "${roleLabel}"(으)로 변경할까요?`, `Change ${u.username}'s role to "${roleLabel}"?`))) {
    roleDraft[u.id] = prevRoleId
    return
  }
  grantingId.value = u.id
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: { userId: u.id, role: roleId }
    })
    await load(true)
  } catch (e: any) {
    alert(e?.data?.statusMessage || t('역할 변경에 실패했습니다.', 'Failed to change role.'))
    roleDraft[u.id] = prevRoleId
  } finally {
    grantingId.value = null
  }
}

function syncRoleDraft(list: MemberRow[]) {
  for (const u of list) {
    roleDraft[u.id] = u.roleId
  }
}

const pageSize = computed(() => {
  const n = Number(pageSizeInput.value || 20)
  return Math.max(1, Math.min(500, Number.isFinite(n) ? Math.floor(n) : 20))
})

function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
// 보유금액은 원화로 표시한다(환율을 못 불러오면 USDT로 대체 표시).
const krwPerUsdt = ref(0)
function fmtBal(usdt: number) {
  const n = Number(usdt || 0)
  if (krwPerUsdt.value > 0) return Math.round(n * krwPerUsdt.value).toLocaleString('ko-KR') + t('원', ' KRW')
  return fmt2(n) + ' USDT'
}
// 총 입금액/총 출금액: 처리 완료된 요청의 원화 합계
function fmtKrw(krw: number) {
  return Math.round(Number(krw || 0)).toLocaleString('ko-KR') + t('원', ' KRW')
}
async function loadKrwRate() {
  const res = await $fetch<{ rate: number }>('/api/settings/krw-rate').catch(() => null)
  krwPerUsdt.value = Number(res?.rate || 0)
}

function fmt2(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
// 관리자(회원이 아닌 계정)는 입출금/수익 개념이 없어서 총입금액·총출금액·누적수익을 '-'로 표시한다(보유금액은 그대로 표시).
function isStaff(u: { roleId: string }) {
  return u.roleId !== 'user'
}
// 누적수익은 원화로, 끝에 '원'을 붙여 표시한다(환율을 못 불러오면 USDT로 대체 표시).
function signedProfitKrw(usdt: number) {
  const n = Number(usdt || 0)
  const sign = n >= 0 ? '+' : '-'
  if (krwPerUsdt.value > 0) return `${sign}${Math.round(Math.abs(n) * krwPerUsdt.value).toLocaleString('ko-KR')}${t('원', ' KRW')}`
  return `${sign}${fmt2(Math.abs(n))} USDT`
}
function signedProfitText(v: number) {
  const n = Number(v || 0)
  return `${n >= 0 ? '+' : '-'}${fmt2(Math.abs(n))}`
}
function tradeResultLabel(tr: Pick<MemberTradeRow, 'liquidation' | 'pnl'>) {
  if (Boolean(tr?.liquidation)) return t('강제청산', 'Liquidated')
  return Number(tr?.pnl || 0) >= 0 ? t('수익', 'Profit') : t('손실', 'Loss')
}
function tradeResultBadgeClass(tr: Pick<MemberTradeRow, 'liquidation' | 'pnl'>) {
  if (Boolean(tr?.liquidation)) return 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
  return Number(tr?.pnl || 0) >= 0 ? 'bg-blue-500/15 text-blue-300 ring-blue-400/20' : 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
}
function fmtPrice(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}
function formatDateTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d)
}

type SortKey =
  | 'role'
  | 'username'
  | 'name'
  | 'referralCode'
  | 'topCode'
  | 'balanceUsdt'
  | 'totalDepositKrw'
  | 'totalWithdrawKrw'
  | 'cumulativeProfit'
  | 'created_at'
  | 'last_login'
  | 'online'
// 기본 정렬: 보유금액 내림차순
const sortKey = ref<SortKey | null>('balanceUsdt')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
function sortArrow(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const rows = items.value.filter((u) => {
    if (roleFilter.value === 'user' && u.roleId !== 'user') return false
    if (roleFilter.value === 'super_admin' && u.roleId !== 'super_admin') return false
    if (roleFilter.value === 'admin' && (u.roleId === 'user' || u.roleId === 'super_admin')) return false
    if (onlineFilter.value) {
      const want = onlineFilter.value === '접속'
      if (u.online !== want) return false
    }
    if (fromDate.value) {
      const d = dateOnly(u.created_at)
      if (d < fromDate.value) return false
    }
    if (toDate.value) {
      const d = dateOnly(u.created_at)
      if (d > toDate.value) return false
    }
    if (!q) return true
    return [u.username, u.name, String(u.id)].some((v) => String(v).toLowerCase().includes(q))
  })

  if (!sortKey.value) return rows
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'online') return (Number(a.online) - Number(b.online)) * dir
    const av = a[key]
    const bv = b[key]
    if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

const totalBalance = computed(() => items.value.reduce((sum, u) => sum + Number(u.balanceUsdt || 0), 0))

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
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
const memberTradeTotalPages = computed(() => Math.max(1, Math.ceil(memberTrades.value.length / memberTradePageSize)))
const pagedMemberTrades = computed(() => {
  const start = (memberTradePage.value - 1) * memberTradePageSize
  return memberTrades.value.slice(start, start + memberTradePageSize)
})
const memberTradePageNumbers = computed(() => {
  const total = memberTradeTotalPages.value
  const start = Math.floor((memberTradePage.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showMemberTradeTail = computed(() => {
  const nums = memberTradePageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < memberTradeTotalPages.value
})

watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(pageSizeInput, (v) => {
  const next = Math.max(1, Math.min(500, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 20))
  if (next !== Number(v)) pageSizeInput.value = next
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(memberTrades, () => {
  if (memberTradePage.value > memberTradeTotalPages.value) memberTradePage.value = memberTradeTotalPages.value
})

async function load(silent = false) {
  if (loadingNow) return
  loadingNow = true
  if (!silent) loading.value = true
  try {
    const res = await $fetch<{ items: MemberRow[] }>('/api/admin/members', { query: silent ? { p: 1 } : undefined })
    // 최고관리자(admin) 계정은 회원목록에 보이지 않게 한다(총 보유금액 합계에서도 빠짐).
    items.value = (res.items || []).filter((u) => u.roleId !== 'super_admin')
    syncRoleDraft(items.value)
    if (selectedMember.value) {
      const fresh = (res.items || []).find((u) => Number(u.id) === Number(selectedMember.value?.id))
      if (fresh) selectedMember.value = fresh
    }
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('회원 목록을 불러오지 못했습니다.', 'Failed to load member list.')
  } finally {
    loading.value = false
    loadingNow = false
  }
}

async function loadMemberTrades(silent = false) {
  if (!selectedMember.value) return
  if (!silent) tradeLoading.value = true
  try {
    const res = await $fetch<{ items: MemberTradeRow[] }>('/api/admin/trades', {
      query: { limit: 200, offset: 0, userId: selectedMember.value.id }
    })
    memberTrades.value = res.items || []
    memberTradePage.value = 1
    tradeError.value = null
  } catch (e: any) {
    tradeError.value = e?.data?.statusMessage || t('거래 내역을 불러오지 못했습니다.', 'Failed to load trade history.')
  } finally {
    tradeLoading.value = false
  }
}

async function openTradeModal(member: MemberRow) {
  selectedMember.value = member
  tradeModalOpen.value = true
  memberTradePage.value = 1
  await loadMemberTrades()
}

function closeTradeModal() {
  tradeModalOpen.value = false
  memberTrades.value = []
  memberTradePage.value = 1
  tradeError.value = null
  if (!balanceModalOpen.value) selectedMember.value = null
}

// 보유금액 수정은 화면에 보이는 그대로 원화로 입력받고, 저장할 때 현재 환율로 USDT로 바꿔 저장한다(환율을 못 불러오면 USDT 입력).
const balanceInKrw = computed(() => krwPerUsdt.value > 0)
const balanceKrwText = ref('')
let balanceKrwInitial = ''
const balanceKrwNumber = computed(() => Number(balanceKrwText.value.replace(/[^\d]/g, '') || 0))
function onBalanceKrwInput(e: Event) {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
  balanceKrwText.value = digits ? Number(digits).toLocaleString('ko-KR') : ''
  el.value = balanceKrwText.value
}

function openBalanceModal(member: MemberRow) {
  selectedMember.value = member
  balanceDraft.value = Number(member.balanceUsdt || 0)
  balanceKrwText.value = balanceInKrw.value ? Math.round(Number(member.balanceUsdt || 0) * krwPerUsdt.value).toLocaleString('ko-KR') : ''
  balanceKrwInitial = balanceKrwText.value
  balanceError.value = null
  balanceModalOpen.value = true
}

function closeBalanceModal() {
  balanceModalOpen.value = false
  balanceError.value = null
  balanceDraft.value = 0
  if (!tradeModalOpen.value) selectedMember.value = null
}

async function saveBalance() {
  if (!selectedMember.value) return
  let usdt = Number(balanceDraft.value)
  if (balanceInKrw.value) {
    if (!balanceKrwText.value) {
      balanceError.value = t('금액을 입력하세요.', 'Enter an amount.')
      return
    }
    // 원화 값을 그대로 두고 저장하면 기존 USDT 값을 그대로 유지(환산 반올림으로 값이 미세하게 바뀌지 않게)
    usdt = balanceKrwText.value === balanceKrwInitial ? Number(selectedMember.value.balanceUsdt || 0) : balanceKrwNumber.value / krwPerUsdt.value
  }
  if (!Number.isFinite(usdt) || usdt < 0) {
    balanceError.value = t('0 이상 금액만 입력할 수 있습니다.', 'Only amounts of 0 or more can be entered.')
    return
  }
  balanceSaving.value = true
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: { userId: selectedMember.value.id, usdt }
    })
    await load(true)
    closeBalanceModal()
  } catch (e: any) {
    balanceError.value = e?.data?.statusMessage || t('보유금액 수정에 실패했습니다.', 'Failed to update balance.')
  } finally {
    balanceSaving.value = false
  }
}

onMounted(async () => {
  loadKrwRate().catch(() => {})
  await loadRoles()
  await load()
  // 화면이 보이는 동안 5초마다 자동 갱신(예전 1초). 수정 창이 열려 있으면 건너뛴다.
  pollTimer = startVisiblePolling(() => {
    if (autoRefreshPaused.value) return
    return load(true)
  }, 5000)
})

onBeforeUnmount(() => {
  if (pollTimer) pollTimer()
  pollTimer = null
})
</script>

<style scoped>
.sortable-th {
  color: rgb(203 213 225 / 0.9);
  transition: color 0.15s ease;
}
.sortable-th:hover {
  color: #fff;
}
.sortable-th .sort-icon {
  margin-left: 2px;
  font-size: 12px;
  color: rgb(148 163 184 / 0.6);
}
.sortable-th:hover .sort-icon {
  color: rgb(203 213 225 / 0.9);
}

.date-input {
  position: relative;
  min-width: 140px;
  padding-right: 24px;
  color-scheme: dark;
}

.date-input::-webkit-calendar-picker-indicator {
  margin-left: auto;
  cursor: pointer;
  opacity: 0.9;
}

.member-modal-enter-active,
.member-modal-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.member-modal-enter-from,
.member-modal-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>

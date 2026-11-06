<template>
  <!-- 상단 [이벤트]를 누르면 오는 곳: 첫 번째 이벤트 설정 화면으로 바로 넘어간다(없으면 추가 버튼). -->
  <div class="space-y-6">
    <div v-if="empty" class="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
      <div class="text-sm text-slate-400">{{ t('등록된 이벤트가 없습니다.', 'No events yet.') }}</div>
      <button type="button" class="mt-4 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400" @click="addModal?.show()">
        + {{ t('이벤트 추가', 'Add event') }}
      </button>
    </div>
    <div v-else class="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">{{ t('불러오는 중…', 'Loading…') }}</div>
    <AdminEventAddModal ref="addModal" @created="(id: number) => navigateTo(`/admin/events/${id}`)" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin', 'super-admin'] })
const { t } = useLocale()
const addModal = ref<any>(null)
const empty = ref(false)

onMounted(async () => {
  const res = await $fetch<{ items: Array<{ id: number }> }>('/api/admin/events').catch(() => ({ items: [] }))
  const first = res.items?.[0]
  if (first) await navigateTo(`/admin/events/${first.id}`, { replace: true })
  else empty.value = true
})
</script>

// 화면 이동이 끝날 때마다(처음 열 때 포함) 안 읽은 쪽지가 있으면 "새 쪽지가 도착했습니다" 팝업을 띄운다.
export default defineNuxtPlugin((nuxtApp) => {
  const { remindUnreadOnEnter } = useMessages()
  const router = useRouter()
  nuxtApp.hook('page:finish', () => {
    remindUnreadOnEnter(router.currentRoute.value.path)
  })
})

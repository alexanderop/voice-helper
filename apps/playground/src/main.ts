import { createApp, h } from 'vue'
import { useEventListener } from '@starter/composables'
import '@starter/ui/styles.css'
import './app/app.css'
import App from './app/App.vue'
import AppErrorBoundary from './app/AppErrorBoundary.vue'
import { createApplication } from './app/bootstrap'

const application = createApplication()
const app = createApp({
  render: () =>
    h(AppErrorBoundary, null, {
      default: () => h(App, { notes: application.notes }),
    }),
})
app.use(application.router).mount('#app')
function onPageHide(event: PageTransitionEvent) {
  if (!event.persisted) application.close()
}
const stopPageHide = useEventListener(window, 'pagehide', onPageHide)
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stopPageHide()
    app.unmount()
    application.close()
  })

import { createApp, h } from 'vue'
import '@talk-coach/ui/styles.css'
import './app/app.css'
import App from './app/App.vue'
import AppErrorBoundary from './app/AppErrorBoundary.vue'
import { createApplication } from './app/bootstrap'

const application = createApplication()
const app = createApp({
  render: () =>
    h(AppErrorBoundary, null, {
      default: () => h(App, { modelStatus: application.modelStatus }),
    }),
})
app.use(application.router).mount('#app')
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    app.unmount()
    application.close()
  })

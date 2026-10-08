import { createRouter, createWebHashHistory } from 'vue-router'
import { SettingsPage } from '../features/settings'

export function createApplication() {
  let scrollRequest = 0
  const router = createRouter({
    async scrollBehavior(_to, _from, savedPosition) {
      const request = ++scrollRequest
      if (!savedPosition) return { left: 0, top: 0 }
      await waitForScrollHeight(savedPosition.top + window.innerHeight)
      return request === scrollRequest ? savedPosition : false
    },
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/settings',
        name: 'settings',
        component: SettingsPage,
      },
      { path: '/:pathMatch(.*)*', redirect: '/settings' },
    ],
  })
  return { router }
}

function waitForScrollHeight(height: number): Promise<void> {
  if (document.documentElement.scrollHeight >= height) return Promise.resolve()
  return new Promise((resolve) => {
    const observer = new ResizeObserver(() => {
      if (document.documentElement.scrollHeight >= height) finish()
    })
    const timeout = window.setTimeout(finish, 1500)
    function finish() {
      observer.disconnect()
      window.clearTimeout(timeout)
      resolve()
    }
    observer.observe(document.body)
  })
}

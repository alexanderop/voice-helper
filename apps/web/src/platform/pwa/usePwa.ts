import { computed, effectScope, onMounted, ref, type Ref } from 'vue'
import {
  useEventListener,
  useMediaQuery,
  useOnline,
} from '@talk-coach/composables'

type InstallPrompt = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isInstallPrompt(event: Event): event is InstallPrompt {
  return 'prompt' in event && 'userChoice' in event
}

export function usePwa(busy: Ref<boolean>) {
  const online = useOnline()
  const offlineReady = ref(false)
  const updateState = ref<'current' | 'waiting' | 'reload'>('current')
  const deferred = ref(false)
  const updating = ref(false)
  const checking = ref(false)
  const status = ref('')
  const standalone = useMediaQuery('(display-mode: standalone)')
  const accepted = ref(false)
  const installed = computed(() => standalone.value || accepted.value)
  const prompt = ref<InstallPrompt | null>(null)
  let registration: ServiceWorkerRegistration | undefined
  let controller =
    'serviceWorker' in navigator ? navigator.serviceWorker.controller : null
  let approved = false
  // Listeners attached after an await outlive setup, so they join this scope.
  const scope = effectScope()
  function watchWorker(worker: ServiceWorker) {
    const sync = () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        updateState.value = 'waiting'
        deferred.value = false
      }
      if (worker.state === 'activated') offlineReady.value = true
    }
    scope.run(() => useEventListener(worker, 'statechange', sync))
    sync()
  }
  function checkedStatus() {
    if (updateState.value !== 'current')
      return 'A new version is ready when you are.'
    if (registration?.installing) return 'Checking the latest version…'
    return 'You are up to date.'
  }
  async function checkForUpdates() {
    if (!registration) {
      status.value = import.meta.env.DEV
        ? 'Offline installation is available in the production build.'
        : 'The app is not ready to check for updates yet.'
      return
    }
    checking.value = true
    try {
      await registration.update()
      if (registration.waiting) updateState.value = 'waiting'
      if (updateState.value !== 'current') deferred.value = false
      status.value = checkedStatus()
    } catch {
      status.value =
        'Could not check for updates. Try again when you are online.'
    } finally {
      checking.value = false
    }
  }
  function update() {
    if (busy.value) return
    if (updateState.value === 'reload') {
      window.location.reload()
      return
    }
    if (!registration?.waiting) return
    approved = true
    updating.value = true
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  async function install() {
    const available = prompt.value
    if (!available) return
    prompt.value = null
    try {
      await available.prompt()
      const choice = await available.userChoice
      if (choice.outcome === 'accepted') accepted.value = true
    } catch {
      status.value = 'Use your browser menu to install this app.'
    }
  }
  useEventListener(window, 'beforeinstallprompt', (event) => {
    event.preventDefault()
    if (isInstallPrompt(event)) prompt.value = event
  })
  useEventListener(window, 'appinstalled', () => {
    accepted.value = true
    prompt.value = null
  })
  onMounted(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
    scope.run(() =>
      useEventListener(navigator.serviceWorker, 'controllerchange', () => {
        const previous = controller
        controller = navigator.serviceWorker.controller
        if (!previous || previous === controller) return
        updateState.value = 'reload'
        deferred.value = false
        updating.value = false
        if (approved && !busy.value) window.location.reload()
        else
          status.value =
            'An update is ready. Save your changes, then update this tab.'
      }),
    )
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .then((value) => {
        if (!scope.active) return
        registration = value
        offlineReady.value = value.active?.state === 'activated'
        if (value.waiting) updateState.value = 'waiting'
        scope.run(() =>
          useEventListener(value, 'updatefound', () => {
            if (value.installing) watchWorker(value.installing)
          }),
        )
        if (value.installing) watchWorker(value.installing)
      })
      .catch(() => {
        if (scope.active)
          status.value =
            'Offline setup could not finish. Reopen the app online to try again.'
      })
  })
  return {
    online,
    offlineReady,
    updateAvailable: computed(() => updateState.value !== 'current'),
    deferred,
    updating,
    checking,
    status,
    installed,
    canInstall: computed(() => prompt.value !== null),
    checkForUpdates,
    update,
    install,
  }
}

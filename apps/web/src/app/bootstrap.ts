import { computed, shallowRef } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { useOnline } from '@talk-coach/composables'
import {
  createDrillService,
  createIndexedDbDrills,
  ProgressPage,
  ResultPage,
  TodayPage,
} from '../features/drills'
import { SettingsPage } from '../features/settings'
import {
  createModelCache,
  createWhisperTranscriber,
  createWhisperWorker,
  SetupPage,
  type ModelStatus,
} from '../features/speech'
import { createAudioDecoder } from '../platform/audio/createAudioDecoder'
import { createMicrophone } from '../platform/audio/createMicrophone'
import {
  readDeviceDiagnostics,
  requestPersistentStorage,
} from '../platform/device/readDeviceDiagnostics'
import { diagnosticRows } from './diagnostics'

export function createApplication() {
  const modelStatus = shallowRef<ModelStatus>({ status: 'checking' })
  const repository = createIndexedDbDrills({ indexedDB: window.indexedDB })
  const transcriber = createWhisperTranscriber({
    createWorker: createWhisperWorker,
    cache: createModelCache({
      caches: 'caches' in window ? window.caches : undefined,
      runtimeBase: new URL(`${import.meta.env.BASE_URL}ort/`, location.origin)
        .href,
    }),
    onStatus: (status) => {
      modelStatus.value = status
    },
  })
  const service = createDrillService({
    repository,
    transcriber,
    decoder: createAudioDecoder(),
    now: Date.now,
    newId: () => crypto.randomUUID(),
  })
  const microphone = createMicrophone({ mediaDevices: navigator.mediaDevices })
  const practiceReady = computed(() => modelStatus.value.status === 'ready')
  const online = useOnline()

  requestPersistentStorage()
  const checked = transcriber.start()

  const readDiagnostics = async () =>
    diagnosticRows({
      model: modelStatus.value,
      speech: transcriber.diagnostics(),
      device: await readDeviceDiagnostics(),
      version: __APP_VERSION__,
    })

  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/',
        name: 'today',
        component: TodayPage,
        props: { service, microphone, practiceReady },
      },
      {
        path: '/setup',
        name: 'setup',
        component: SetupPage,
        props: {
          status: modelStatus,
          online,
          download: transcriber.download,
        },
      },
      {
        path: '/drills/:id',
        name: 'result',
        component: ResultPage,
        props: (route) => ({ service, id: String(route.params.id) }),
      },
      {
        path: '/progress',
        name: 'progress',
        component: ProgressPage,
        props: { service, practiceReady },
      },
      {
        path: '/settings',
        name: 'settings',
        component: SettingsPage,
        props: { data: service, readDiagnostics },
      },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  })

  // First launch opens Setup once. After that Today shows a setup notice.
  let offeredSetup = false
  router.beforeEach(async (to) => {
    if (to.name !== 'today' || offeredSetup) return true
    offeredSetup = true
    await checked
    return modelStatus.value.status === 'missing' ? { name: 'setup' } : true
  })

  return { router, modelStatus, close: () => repository.close() }
}

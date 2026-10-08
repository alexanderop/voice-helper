<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Download, ShieldCheck } from '@lucide/vue'
import { UiButton } from '@talk-coach/ui'
import {
  ENGINE_SIZE_LABEL,
  MODEL_SIZE_LABEL,
  type ModelStatus,
} from '../domain/model'

const { status, online, download } = defineProps<{
  status: { readonly value: ModelStatus }
  online: { readonly value: boolean }
  download: () => void
}>()
const router = useRouter()

const mb = (bytes: number) => Math.round(bytes / 1_000_000)
const progress = computed(() => {
  const current = status.value
  if (current.status !== 'downloading' || current.totalBytes === 0)
    return undefined
  return {
    percent: Math.round((current.loadedBytes / current.totalBytes) * 100),
    label: `Model files: ${mb(current.loadedBytes)} of ${mb(current.totalBytes)} MB`,
  }
})

const ACTIONS: Readonly<
  Record<ModelStatus['status'], { label: string; enabled: boolean }>
> = {
  checking: { label: 'Checking this device', enabled: false },
  missing: { label: 'Download the speech model', enabled: true },
  downloading: { label: 'Ready when the download finishes', enabled: false },
  loading: { label: 'Preparing the model', enabled: false },
  ready: { label: 'Start practicing', enabled: true },
  failed: { label: 'Try the download again', enabled: true },
}
const action = computed(() => ACTIONS[status.value.status])
const announcement = computed(() => {
  const current = status.value
  if (current.status === 'downloading')
    return `Downloading, ${Math.floor((progress.value?.percent ?? 0) / 25) * 25} percent.`
  if (current.status === 'loading') return 'Preparing the model.'
  if (current.status === 'ready') return 'The speech model is ready.'
  if (current.status === 'failed') return 'The download did not finish.'
  return ''
})

function act() {
  if (status.value.status === 'ready') void router.push({ name: 'today' })
  else download()
}
</script>
<template>
  <section class="page setup-page" aria-labelledby="setup-title">
    <p class="eyebrow setup-page__kicker">One-time setup</p>
    <div class="setup-emblem" aria-hidden="true">
      <span>Aa</span><ShieldCheck :size="22" class="setup-emblem__shield" />
    </div>
    <h1 id="setup-title" class="display-title setup-page__title">
      Your voice.<br />Your device.
    </h1>
    <p class="setup-page__lead">
      Download the {{ MODEL_SIZE_LABEL }} speech model and its
      {{ ENGINE_SIZE_LABEL }} engine once. Then practice and get feedback
      offline.
    </p>
    <div v-if="progress" class="download">
      <label for="model-progress" class="download__label"
        ><span>Downloading model</span
        ><span>{{ progress.percent }}%</span></label
      >
      <progress id="model-progress" max="100" :value="progress.percent">
        {{ progress.percent }}%
      </progress>
      <p class="download__meta">
        <span>{{ progress.label }}</span
        ><span>Keep this screen open</span>
      </p>
    </div>
    <p v-if="status.value.status === 'failed'" class="setup-page__error">
      The download did not finish. {{ status.value.reason }}
    </p>
    <p v-if="!online.value && status.value.status !== 'ready'" class="notice">
      You are offline. The download needs a connection.
    </p>
    <div class="privacy-block">
      <h2>
        <ShieldCheck :size="18" aria-hidden="true" />Audio never leaves your
        phone.
      </h2>
      <p>No account. No cloud processing. The download needs a connection.</p>
      <p class="fine-print">
        If your browser clears the model to save space, this screen comes back
        and you can download it again.
      </p>
    </div>
    <p class="sr-only" role="status">{{ announcement }}</p>
    <div class="page-action page-action--anchored">
      <UiButton
        size="lg"
        :disabled="
          !action.enabled || (!online.value && status.value.status !== 'ready')
        "
        :loading="
          status.value.status === 'loading' ||
          status.value.status === 'checking'
        "
        @click="act"
        ><Download
          v-if="status.value.status !== 'ready'"
          :size="20"
          aria-hidden="true"
        />{{ action.label }}</UiButton
      >
    </div>
  </section>
</template>

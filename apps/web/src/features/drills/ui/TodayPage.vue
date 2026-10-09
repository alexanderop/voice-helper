<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Mic, ShieldCheck, Square } from '@lucide/vue'
import { UiButton, UiWaveform } from '@talk-coach/ui'
import { TIME_LIMIT_MS, type DrillKind } from '../domain/drill'
import { daysPracticed, promptFor } from '../domain/practice'
import { isBusy } from '../domain/session'
import type { DrillService } from '../application/createDrillService'
import type { Microphone } from '../ports/ports'
import { useRecordingSession } from './useRecordingSession'
import { sessionMessage } from './sessionMessages'

type SpokenKind = Exclude<DrillKind, 'import'>

const { service, microphone, practiceReady } = defineProps<{
  service: DrillService
  microphone: Microphone
  practiceReady: { readonly value: boolean }
}>()
const route = useRoute()
const router = useRouter()
const recorder = useRecordingSession({ service, microphone })
const days = ref(0)
const sessionNumber = ref(1)
const kind = ref<SpokenKind>(
  route.query.kind === 'opening' || route.query.kind === 'closing'
    ? route.query.kind
    : 'drill',
)
const today = promptFor('drill', Date.now())
const retryPrompt =
  typeof route.query.prompt === 'string' ? route.query.prompt : undefined
const prompt = computed(() =>
  kind.value === 'drill'
    ? (retryPrompt ?? today.prompt)
    : promptFor(kind.value, Date.now()).prompt,
)
const session = recorder.session
const busy = computed(() => isBusy(session.value))
const message = computed(() => sessionMessage(session.value))
function clock(ms: number) {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
const limitMs = computed(() => TIME_LIMIT_MS[kind.value])
const remainingMs = computed(() => recorder.remainingMs() ?? limitMs.value)
const timer = computed(() => clock(remainingMs.value))
const elapsed = computed(() =>
  session.value.status === 'recording'
    ? 1 - remainingMs.value / limitMs.value
    : undefined,
)

function begin(next: SpokenKind) {
  kind.value = next
  void recorder.start(next, prompt.value)
}

onMounted(async () => {
  const drills = await service.list()
  if (drills.isErr()) return
  days.value = daysPracticed(drills.value)
  sessionNumber.value =
    drills.value.filter((drill) => drill.kind !== 'import').length + 1
})

watch(session, (value) => {
  if (value.status === 'done')
    void router.push({ name: 'result', params: { id: value.drillId } })
})
</script>
<template>
  <section class="page today-page" aria-labelledby="today-title">
    <p class="page-meta">
      <span class="eyebrow"
        >Session {{ String(sessionNumber).padStart(3, '0') }}</span
      ><span v-if="days" class="pill"
        >{{ days }} {{ days === 1 ? 'day' : 'days' }} practiced</span
      >
    </p>
    <h1 id="today-title" class="display-title">Find your<br />clear signal.</h1>
    <p class="eyebrow">
      {{
        kind === 'drill'
          ? `Today's prompt / ${String(today.number).padStart(2, '0')}`
          : `Rehearse your ${kind}`
      }}
    </p>
    <h2 class="prompt" data-testid="prompt">{{ prompt }}</h2>
    <div class="recorder">
      <p class="recorder__head eyebrow">
        <span v-if="session.status === 'recording'" class="recorder__live"
          >Recording</span
        ><span v-else>Ready to record</span
        ><span>{{ clock(limitMs) }} max</span>
      </p>
      <p class="timer" role="timer" :aria-label="`Time left ${timer}`">
        {{ timer }}
      </p>
      <UiWaveform :bars="40" :progress="elapsed" />
      <p class="recorder__caption">One idea. Room to pause.</p>
    </div>
    <div v-if="!practiceReady.value" class="notice">
      <p>Practice starts once the speech model is on this device.</p>
      <RouterLink :to="{ name: 'setup' }" class="text-link"
        >Set up the speech model</RouterLink
      >
    </div>
    <p class="section-label">Short rehearsals</p>
    <div class="rehearse">
      <button
        v-for="option in ['opening', 'closing'] as const"
        :key="option"
        type="button"
        class="rehearse__option"
        :disabled="busy || !practiceReady.value"
        @click="begin(option)"
      >
        <span>Rehearse {{ option }}</span
        ><span class="rehearse__time"
          >30s <ArrowRight :size="16" aria-hidden="true"
        /></span>
      </button>
    </div>
    <div class="page-action page-action--anchored">
      <p class="status-line" role="status">{{ message }}</p>
      <UiButton
        v-if="session.status === 'recording'"
        size="lg"
        @click="recorder.stop"
        ><Square :size="20" aria-hidden="true" />Stop and analyze</UiButton
      >
      <UiButton
        v-else
        size="lg"
        :disabled="busy || !practiceReady.value"
        :loading="session.status === 'processing'"
        @click="begin('drill')"
        ><Mic :size="20" aria-hidden="true" />Start 2-minute drill</UiButton
      >
      <p class="privacy">
        <ShieldCheck :size="14" aria-hidden="true" />Audio stays on this phone
      </p>
    </div>
  </section>
</template>

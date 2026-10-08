<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Mic, ShieldCheck, Square } from '@lucide/vue'
import { UiButton } from '@talk-coach/ui'
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
const dateLabel = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function clock(ms: number) {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
const timer = computed(() =>
  clock(recorder.remainingMs() ?? TIME_LIMIT_MS[kind.value]),
)

function begin(next: SpokenKind) {
  kind.value = next
  void recorder.start(next, prompt.value)
}

onMounted(async () => {
  const drills = await service.list()
  if (drills.isOk()) days.value = daysPracticed(drills.value)
})

watch(session, (value) => {
  if (value.status === 'done')
    void router.push({ name: 'result', params: { id: value.drillId } })
})
</script>
<template>
  <section class="page today-page" aria-labelledby="today-title">
    <p class="page-meta">
      <span class="eyebrow">{{ dateLabel }}</span
      ><span v-if="days" class="page-meta__note"
        >{{ days }} {{ days === 1 ? 'day' : 'days' }} practiced</span
      >
    </p>
    <h1 id="today-title" class="display-title">
      One thought.<br />Spoken clearly.
    </h1>
    <hr class="rule" />
    <p class="eyebrow">
      {{
        kind === 'drill'
          ? `Today's prompt / ${String(today.number).padStart(2, '0')}`
          : `Rehearse your ${kind}`
      }}
    </p>
    <h2 class="prompt" data-testid="prompt">{{ prompt }}</h2>
    <p class="muted">Imagine a curious colleague is listening.</p>
    <div class="timer-block">
      <p class="timer" role="timer" :aria-label="`Time left ${timer}`">
        {{ timer }}
      </p>
      <p class="muted">No perfect take needed.</p>
    </div>
    <div v-if="!practiceReady.value" class="notice">
      <p>Practice starts once the speech model is on this device.</p>
      <RouterLink :to="{ name: 'setup' }" class="text-link"
        >Set up the speech model</RouterLink
      >
    </div>
    <p class="section-label">Or, find your first and last words</p>
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
          >30s <ArrowRight :size="18" aria-hidden="true"
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
        ><Mic :size="22" aria-hidden="true" />Start 2-minute drill</UiButton
      >
      <p class="privacy">
        <ShieldCheck :size="14" aria-hidden="true" />Audio stays on this phone
      </p>
    </div>
  </section>
</template>

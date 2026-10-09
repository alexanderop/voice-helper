<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { Check, RotateCcw, ShieldCheck } from '@lucide/vue'
import { UiButton, UiWaveform } from '@talk-coach/ui'
import { justPracticed, practiceCalendar } from '../domain/calendar'
import { coachingLine } from '../domain/coaching'
import { previousOfKind, type Drill } from '../domain/drill'
import type { DrillService } from '../application/createDrillService'
import { daysOfGoal, remainingLine, streakHeadline } from './streakMessages'
import TranscriptView from './TranscriptView.vue'

const { service, id } = defineProps<{ service: DrillService; id: string }>()
const router = useRouter()
const state = shallowRef<
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'failed' }
  | {
      status: 'ready'
      drill: Drill
      coaching: string
      streak: { current: number; practiced: number } | undefined
    }
>({ status: 'loading' })

onMounted(async () => {
  const drills = await service.list()
  if (drills.isErr()) {
    state.value = { status: 'failed' }
    return
  }
  const drill = drills.value.find((item) => item.id === id)
  if (!drill) {
    state.value = { status: 'missing' }
    return
  }
  const now = Date.now()
  const calendar = practiceCalendar(drills.value, now)
  state.value = {
    status: 'ready',
    drill,
    coaching: coachingLine(drill, previousOfKind(drills.value, drill)),
    streak: justPracticed(drills.value, drill, now)
      ? {
          current: calendar.current,
          practiced: calendar.weeks.at(-1)?.practiced ?? 0,
        }
      : undefined,
  }
})

function minutes(ms: number | null) {
  if (ms === null) return 'Untimed'
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
const known = (value: number | null) => (value === null ? '–' : String(value))

const metrics = computed(() => {
  if (state.value.status !== 'ready') return []
  const { analysis } = state.value.drill
  return [
    { label: 'yeah', value: String(analysis.groups.yeah) },
    { label: 'Other fillers', value: String(analysis.groups.um) },
    { label: 'Hedges', value: String(analysis.groups.hedge) },
    { label: 'Pauses', value: known(analysis.pauseCount) },
    { label: 'Words/min', value: known(analysis.wordsPerMinute) },
  ]
})
const fromCaptions = computed(
  () =>
    state.value.status === 'ready' &&
    state.value.drill.kind === 'import' &&
    state.value.drill.analysis.pauseCount === null,
)

function retry(drill: Drill) {
  if (drill.kind === 'import') {
    void router.push({ name: 'progress' })
    return
  }
  void router.push({
    name: 'today',
    query: { kind: drill.kind, prompt: drill.prompt },
  })
}
</script>
<template>
  <section class="page result-page" aria-labelledby="result-title">
    <p v-if="state.status === 'loading'" role="status">Loading this drill.</p>
    <template v-else-if="state.status !== 'ready'">
      <h1 id="result-title" class="display-title">
        {{
          state.status === 'missing'
            ? 'This drill is not here.'
            : 'This drill could not be read.'
        }}
      </h1>
      <RouterLink :to="{ name: 'progress' }" class="text-link"
        >See your practice</RouterLink
      >
    </template>
    <template v-else>
      <aside
        v-if="state.streak"
        class="notice streak-banner"
        aria-label="Practice streak"
      >
        <p class="streak-banner__title">
          {{ streakHeadline(state.streak.current) }}
        </p>
        <p>
          {{ daysOfGoal(state.streak.practiced) }} this week.
          {{ remainingLine(state.streak.practiced) }}
        </p>
      </aside>
      <p class="page-meta">
        <span class="eyebrow"
          >{{
            state.drill.kind === 'import' ? 'Imported talk' : 'Drill complete'
          }}
          · {{ minutes(state.drill.durationMs) }}</span
        ><span class="page-meta__note"
          ><Check :size="14" aria-hidden="true" />Saved here</span
        >
      </p>
      <h1 id="result-title" class="display-title">
        Playback,<br />with perspective.
      </h1>
      <UiWaveform class="divider-wave" variant="dots" :bars="44" />
      <p class="result-prompt">{{ state.drill.prompt }}</p>
      <dl class="metrics">
        <div v-for="metric in metrics" :key="metric.label" class="metric">
          <dt>{{ metric.label }}</dt>
          <dd>{{ metric.value }}</dd>
        </div>
      </dl>
      <p class="fine-print">
        Estimated · um / uh may undercount or overcount. Pauses are silences of
        1 second or more, measured from loudness.
      </p>
      <p v-if="fromCaptions" class="fine-print">
        Imported from captions. Captions often drop um and uh, and carry no
        pauses.
      </p>
      <h2 class="section-label">Transcript</h2>
      <TranscriptView :transcript="state.drill.transcript" />
      <aside class="coaching-callout" aria-labelledby="coaching-title">
        <h2 id="coaching-title" class="eyebrow">One thing to try</h2>
        <p class="coaching" data-testid="coaching">{{ state.coaching }}</p>
      </aside>
      <div class="page-action">
        <UiButton size="lg" @click="retry(state.drill)"
          ><RotateCcw :size="20" aria-hidden="true" />{{
            state.drill.kind === 'import'
              ? 'Back to progress'
              : 'Try this prompt again'
          }}</UiButton
        >
        <p class="privacy">
          <ShieldCheck :size="14" aria-hidden="true" />Audio stays on this phone
        </p>
      </div>
    </template>
  </section>
</template>

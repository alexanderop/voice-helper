<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { FileAudio, FileText } from '@lucide/vue'
import { fillerCount } from '../domain/analysis'
import type { Drill, DrillKind } from '../domain/drill'
import { fillerTrend, importedTalks } from '../domain/practice'
import type { DrillService } from '../application/createDrillService'
import FillerChart from './FillerChart.vue'
import ImportPanel from './ImportPanel.vue'

const { service, practiceReady } = defineProps<{
  service: DrillService
  practiceReady: { readonly value: boolean }
}>()
const drills = shallowRef<Drill[]>([])
const failed = shallowRef(false)

onMounted(async () => {
  const result = await service.list()
  if (result.isOk()) drills.value = result.value
  else failed.value = true
})

const trend = computed(() => fillerTrend(drills.value))
const talks = computed(() => importedTalks(drills.value))
const spoken = computed(() =>
  drills.value.filter((drill) => drill.kind !== 'import').slice(0, 10),
)
const KIND_LABEL: Readonly<Record<DrillKind, string>> = {
  drill: 'Drill',
  opening: 'Opening',
  closing: 'Closing',
  import: 'Import',
}

function length(ms: number | null) {
  if (ms === null) return 'Untimed'
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
const day = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
</script>
<template>
  <section class="page progress-page" aria-labelledby="progress-title">
    <p class="eyebrow">Your practice</p>
    <h1 id="progress-title" class="display-title">A little clearer.</h1>
    <hr class="rule" />
    <p v-if="failed" role="alert">Your drills could not be read.</p>
    <h2 class="section-heading">Fillers per drill</h2>
    <template v-if="trend.length">
      <p class="trend-summary">
        <span class="trend-numbers"
          >{{ trend[0]?.fillers }} → {{ trend.at(-1)?.fillers }}</span
        ><span class="muted"
          >First drill shown to the latest. yeah + um / uh.</span
        >
      </p>
      <FillerChart :points="trend" />
      <p class="fine-print">Estimates, not a score. Some days will vary.</p>
      <h3 class="section-label">Recent drills</h3>
      <ul class="drill-list">
        <li v-for="drill in spoken" :key="drill.id">
          <RouterLink
            :to="{ name: 'result', params: { id: drill.id } }"
            class="drill-row"
            ><span
              ><strong>{{ KIND_LABEL[drill.kind] }}</strong
              ><span class="muted">
                · {{ day(drill.recordedAt) }} · {{ drill.prompt }}</span
              ></span
            ><span class="drill-row__value"
              >{{ fillerCount(drill.analysis) }}
              <span class="muted">fillers</span></span
            ></RouterLink
          >
        </li>
      </ul>
    </template>
    <p v-else class="muted">
      Your first drill will start the line. Two minutes is enough.
    </p>
    <h2 class="section-heading">Imported talks</h2>
    <ul v-if="talks.length" class="drill-list">
      <li v-for="talk in talks" :key="talk.id">
        <RouterLink
          :to="{ name: 'result', params: { id: talk.id } }"
          class="drill-row"
          ><span class="drill-row__name"
            ><component
              :is="talk.durationMs === null ? FileText : FileAudio"
              :size="18"
              aria-hidden="true"
            /><span
              ><strong>{{ talk.name }}</strong
              ><span class="muted"> · {{ length(talk.durationMs) }}</span></span
            ></span
          ><span class="drill-row__value"
            >{{ talk.perMinute ?? talk.fillers }}
            <span class="muted">{{
              talk.perMinute === null ? 'fillers' : 'fillers/min'
            }}</span></span
          ></RouterLink
        >
      </li>
    </ul>
    <p v-else class="muted">No imported talks yet.</p>
    <ImportPanel :service="service" :practice-ready="practiceReady" />
  </section>
</template>

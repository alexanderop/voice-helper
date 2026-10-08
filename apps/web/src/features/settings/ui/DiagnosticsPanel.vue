<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { UiButton, UiCard } from '@talk-coach/ui'
import type { DiagnosticRow, ReadDiagnostics } from '../ports/settings'

const { readDiagnostics } = defineProps<{ readDiagnostics: ReadDiagnostics }>()
const rows = shallowRef<readonly DiagnosticRow[]>([])
const copied = ref('')

async function refresh() {
  rows.value = await readDiagnostics()
}

async function copy() {
  const text = rows.value.map((row) => `${row.label}: ${row.value}`).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = 'Diagnostics copied. They contain no transcripts.'
  } catch {
    copied.value = 'Copy is not available. Select the values instead.'
  }
}

onMounted(refresh)
</script>
<template>
  <UiCard
    element="section"
    aria-labelledby="diagnostics-title"
    class="settings-card"
  >
    <h2 id="diagnostics-title" class="section-heading">Diagnostics</h2>
    <p class="muted">
      For testing on a phone. Record or import once, then check how fast this
      device transcribes.
    </p>
    <dl class="diagnostics" data-testid="diagnostics">
      <div v-for="row in rows" :key="row.label">
        <dt>{{ row.label }}</dt>
        <dd>{{ row.value }}</dd>
      </div>
    </dl>
    <div class="settings-actions">
      <UiButton variant="secondary" @click="refresh">Refresh</UiButton
      ><UiButton variant="secondary" @click="copy">Copy diagnostics</UiButton>
    </div>
    <p role="status" class="status-line">{{ copied }}</p>
  </UiCard>
</template>

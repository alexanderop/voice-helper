<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiCard } from '@talk-coach/ui'
import type { DataCapabilities } from '../ports/settings'

const { data } = defineProps<{ data: DataCapabilities }>()
const confirming = ref(false)
const message = ref('')

function download(json: string) {
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `talk-coach-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function exportDrills() {
  const json = await data.exportJson()
  if (json.isErr()) {
    message.value = 'Your drills could not be read for export.'
    return
  }
  download(json.value)
  message.value = 'Export started. The file holds every drill as JSON.'
}

async function deleteAll() {
  const cleared = await data.clear()
  confirming.value = false
  message.value = cleared.isOk()
    ? 'Every drill was deleted. The speech model stays on this device.'
    : 'Your drills could not be deleted. Try again.'
}
</script>
<template>
  <UiCard element="section" aria-labelledby="data-title" class="settings-card">
    <h2 id="data-title" class="section-heading">Your data</h2>
    <p class="muted">
      Drills live only in this browser. Talk Coach never stores audio, only the
      transcript and counts.
    </p>
    <div class="settings-actions">
      <UiButton variant="secondary" @click="exportDrills"
        >Export drills as JSON</UiButton
      >
      <UiButton v-if="!confirming" variant="danger" @click="confirming = true"
        >Delete all data</UiButton
      >
    </div>
    <div
      v-if="confirming"
      class="confirm"
      role="group"
      aria-label="Confirm delete"
    >
      <p>Delete every drill and imported talk? This cannot be undone.</p>
      <div class="settings-actions">
        <UiButton variant="danger" @click="deleteAll"
          >Delete everything</UiButton
        ><UiButton variant="ghost" @click="confirming = false"
          >Keep my drills</UiButton
        >
      </div>
    </div>
    <p role="status" class="status-line">{{ message }}</p>
  </UiCard>
</template>

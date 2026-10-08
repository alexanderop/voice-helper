<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { FileAudio, FileText } from '@lucide/vue'
import { UiButton } from '@talk-coach/ui'
import { isBusy } from '../domain/session'
import type { DrillService } from '../application/createDrillService'
import { useRecordingSession } from './useRecordingSession'
import { ERROR_MESSAGES, sessionMessage } from './sessionMessages'

const { service, practiceReady } = defineProps<{
  service: DrillService
  practiceReady: { readonly value: boolean }
}>()
const router = useRouter()
const recorder = useRecordingSession({ service })
const audioInput = useTemplateRef<HTMLInputElement>('audio-input')
const captionsInput = useTemplateRef<HTMLInputElement>('captions-input')
const captionsMessage = ref('')
const busy = computed(() => isBusy(recorder.session.value))
const message = computed(
  () => sessionMessage(recorder.session.value) || captionsMessage.value,
)

function chosen(event: Event): File | undefined {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return undefined
  const file = input.files?.[0]
  input.value = ''
  return file
}

async function analyzeAudio(event: Event) {
  const file = chosen(event)
  if (file) await recorder.analyzeFile(file)
}

async function importCaptions(event: Event) {
  const file = chosen(event)
  if (!file) return
  captionsMessage.value = 'Reading captions.'
  const result = await service.importCaptions(file.name, await file.text())
  if (result.isOk()) {
    void router.push({ name: 'result', params: { id: result.value.id } })
    return
  }
  captionsMessage.value =
    result.error === 'too-short'
      ? 'No spoken words were found in this file.'
      : ERROR_MESSAGES[result.error]
}

watch(recorder.session, (value) => {
  if (value.status === 'done')
    void router.push({ name: 'result', params: { id: value.drillId } })
})
</script>
<template>
  <section class="import-panel" aria-labelledby="import-title">
    <h2 id="import-title" class="section-heading">Import a talk</h2>
    <p class="muted">
      Count fillers in a recording you already have. The file is read on this
      device and not kept.
    </p>
    <div class="import-actions">
      <UiButton
        variant="secondary"
        :disabled="busy || !practiceReady.value"
        :loading="busy"
        @click="audioInput?.click()"
        ><FileAudio :size="20" aria-hidden="true" />Analyze an audio
        file</UiButton
      >
      <UiButton
        variant="secondary"
        :disabled="busy"
        @click="captionsInput?.click()"
        ><FileText :size="20" aria-hidden="true" />Import captions</UiButton
      >
    </div>
    <p v-if="!practiceReady.value" class="fine-print">
      Audio files need the speech model.
      <RouterLink :to="{ name: 'setup' }" class="text-link"
        >Set it up</RouterLink
      >.
    </p>
    <p class="fine-print">
      Captions (.vtt, .srt, or .txt) work without the model, but they often drop
      um and uh.
    </p>
    <input
      ref="audio-input"
      class="sr-only"
      type="file"
      accept="audio/*"
      aria-label="Audio file to analyze"
      tabindex="-1"
      :disabled="busy || !practiceReady.value"
      @change="analyzeAudio"
    />
    <input
      ref="captions-input"
      class="sr-only"
      type="file"
      accept=".vtt,.srt,.txt,text/vtt,text/plain"
      aria-label="Caption file to import"
      tabindex="-1"
      :disabled="busy"
      @change="importCaptions"
    />
    <p class="status-line" role="status">{{ message }}</p>
  </section>
</template>

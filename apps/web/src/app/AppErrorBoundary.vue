<script setup lang="ts">
import { nextTick, onErrorCaptured, ref, useTemplateRef } from 'vue'
import { UiButton } from '@talk-coach/ui'
defineSlots<{ default(): unknown }>()
const failed = ref(false)
const heading = useTemplateRef<HTMLElement>('recovery-heading')
const copyStatus = ref('')
const diagnostics = JSON.stringify(
  {
    app: 'Talk Coach',
    version: __APP_VERSION__,
    failure: 'Unexpected interface error',
  },
  null,
  2,
)
onErrorCaptured(() => {
  failed.value = true
  void nextTick(() => heading.value?.focus())
  return false
})
function reload() {
  window.location.reload()
}
async function copyDiagnostics() {
  try {
    await navigator.clipboard.writeText(diagnostics)
    copyStatus.value =
      'Diagnostics copied. No drills or personal data are included.'
  } catch {
    copyStatus.value =
      'Copy is unavailable. You can select the diagnostics below.'
  }
}
</script>
<template>
  <section v-if="failed" role="alert" aria-labelledby="recovery-title">
    <h1 id="recovery-title" ref="recovery-heading" tabindex="-1">
      Something went wrong.
    </h1>
    <p>Your saved drills remain on this device. Reload to try again.</p>
    <UiButton @click="reload">Reload app</UiButton>
    <UiButton variant="secondary" @click="copyDiagnostics"
      >Copy diagnostics</UiButton
    >
    <p role="status">{{ copyStatus }}</p>
    <details>
      <summary>Safe diagnostics</summary>
      <pre>{{ diagnostics }}</pre>
    </details>
  </section>
  <slot v-else />
</template>
<style scoped>
section {
  max-width: 42rem;
  margin: 10vh auto;
  padding: 24px;
  color: var(--color-foreground);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 18px;
}
p {
  line-height: 1.7;
}
button {
  margin: 8px 8px 8px 0;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>

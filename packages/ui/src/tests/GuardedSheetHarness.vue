<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiDialog } from '../index'
const open = ref(false)
const allowClose = ref(false)
const rejected = ref(false)
function requestOpen(value: boolean) {
  if (!value && !allowClose.value) rejected.value = true
  else open.value = value
}
</script>
<template>
  <UiButton @click="open = true">Open guarded sheet</UiButton>
  <UiDialog :open="open" title="Guarded sheet" @update:open="requestOpen">
    <p style="min-height: 120px">An unsaved draft stays here.</p>
    <p v-if="rejected" role="status">Close was rejected.</p>
    <template #footer
      ><UiButton @click="allowClose = true">Allow closing</UiButton></template
    >
  </UiDialog>
</template>

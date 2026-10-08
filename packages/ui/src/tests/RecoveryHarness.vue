<script setup lang="ts">
import { ref } from 'vue'
import { AppShell, UiButton, UiDialog } from '../index'
const open = ref(false)
const removed = ref(false)
function confirmDeletion() {
  removed.value = true
  open.value = false
}
</script>
<template>
  <AppShell>
    <h1>Settings</h1>
    <UiButton v-if="!removed" @click="open = true">Delete item</UiButton>
    <UiDialog v-model:open="open" title="Delete item">
      <UiButton @click="confirmDeletion">Confirm deletion</UiButton>
    </UiDialog>
  </AppShell>
</template>

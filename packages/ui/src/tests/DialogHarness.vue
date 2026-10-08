<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiDialog, UiInput } from '../index'
const open = ref(false)
const title = ref('')
</script>
<template>
  <UiButton @click="open = true">Create note</UiButton
  ><UiDialog
    v-model:open="open"
    title="New note"
    description="Write something worth keeping."
    ><UiInput v-model="title" label="Title" /><template #footer
      ><UiButton @click="open = false">Save note</UiButton></template
    ></UiDialog
  >
</template>

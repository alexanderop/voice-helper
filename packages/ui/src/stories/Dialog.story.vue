<script setup lang="ts">
import { ref } from 'vue'
import { UiDialog, UiButton, UiInput, UiTextarea } from '../index'
const open = ref(false)
const title = ref('A new beginning')
const body = ref('')
</script>
<template>
  <Story title="Components / Dialog and sheet"
    ><Variant title="Responsive editor"
      ><div class="story-layout">
        <p>
          A centered dialog on desktop becomes a sheet below 768px. Escape
          closes it and returns focus to the opening button.
        </p>
        <UiButton @click="open = true">Write a note</UiButton
        ><UiDialog
          v-model:open="open"
          title="A space for your thoughts"
          description="Saved on your device. Ready whenever you are."
          ><UiInput v-model="title" label="Title" /><UiTextarea
            v-model="body"
            label="Note"
            placeholder="What's on your mind?"
          /><template #footer
            ><UiButton variant="secondary" @click="open = false"
              >Cancel</UiButton
            ><UiButton @click="open = false">Save note</UiButton></template
          ></UiDialog
        >
      </div>
      <template #controls
        ><HstCheckbox v-model="open" title="Open" /></template></Variant
  ></Story>
</template>

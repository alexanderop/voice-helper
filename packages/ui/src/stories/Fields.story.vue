<script setup lang="ts">
import { ref } from 'vue'
import { UiInput, UiTextarea } from '../index'
const title = ref('A little room to think')
const body = ref('Keep the ideas that deserve a second look.')
const error = ref('')
</script>
<template>
  <Story title="Components / Fields"
    ><Variant title="Editing"
      ><div class="story-layout">
        <UiInput
          v-model="title"
          label="Title"
          placeholder="Give your note a title"
          :error="error"
        /><UiTextarea
          v-model="body"
          label="Note"
          placeholder="Start writing…"
        />
        <p>Title value: {{ title }}</p>
      </div>
      <template #controls
        ><HstText v-model="error" title="Error message" /></template></Variant
    ><Variant title="Search and disabled"
      ><div class="story-layout">
        <UiInput
          label="Search notes"
          type="search"
          placeholder="Find an idea…"
        /><UiInput
          label="Read-only value"
          model-value="Saved locally"
          readonly
        /><UiTextarea
          label="Disabled field"
          disabled
          model-value="This field cannot be changed."
        /></div></Variant
  ></Story>
</template>

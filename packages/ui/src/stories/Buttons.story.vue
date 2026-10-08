<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Settings } from '@lucide/vue'
import { UiButton, UiIconButton } from '../index'
const loading = ref(false)
const disabled = ref(false)
</script>
<template>
  <Story title="Components / Buttons"
    ><Variant title="Variants"
      ><div class="story-layout">
        <div class="story-row">
          <UiButton :loading="loading" :disabled="disabled"
            ><Plus :size="16" />New note</UiButton
          ><UiButton variant="secondary" :disabled="disabled">Cancel</UiButton
          ><UiButton variant="ghost" :disabled="disabled">Later</UiButton
          ><UiButton variant="danger" :disabled="disabled"
            >Delete note</UiButton
          >
        </div>
        <div class="story-row">
          <UiButton size="sm">Small action</UiButton
          ><UiIconButton label="Open settings"
            ><Settings :size="20"
          /></UiIconButton>
        </div>
      </div>
      <template #controls
        ><HstCheckbox v-model="loading" title="Loading" /><HstCheckbox
          v-model="disabled"
          title="Disabled" /></template></Variant
  ></Story>
</template>

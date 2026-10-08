<script setup lang="ts">
import { ref } from 'vue'
import { Mic } from '@lucide/vue'
import { UiButton } from '../index'
const loading = ref(false)
const disabled = ref(false)
</script>
<template>
  <Story title="Components / Buttons"
    ><Variant title="Variants"
      ><div class="story-layout">
        <div class="story-row">
          <UiButton :loading="loading" :disabled="disabled"
            ><Mic :size="16" />Start 2-minute drill</UiButton
          ><UiButton variant="secondary" :disabled="disabled">Cancel</UiButton
          ><UiButton variant="ghost" :disabled="disabled">Later</UiButton
          ><UiButton variant="danger" :disabled="disabled"
            >Delete all data</UiButton
          >
        </div>
        <div class="story-row">
          <UiButton size="sm">Small action</UiButton>
        </div>
      </div>
      <template #controls
        ><HstCheckbox v-model="loading" title="Loading" /><HstCheckbox
          v-model="disabled"
          title="Disabled" /></template></Variant
  ></Story>
</template>

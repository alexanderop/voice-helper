<script setup lang="ts">
import { ref } from 'vue'
import { NotebookPen } from '@lucide/vue'
import { UiBadge, UiCard, UiEmptyState, UiButton, UiToast } from '../index'
const visible = ref(true)
</script>
<template>
  <Story title="Components / Feedback"
    ><Variant title="Card and badges"
      ><div class="story-layout">
        <UiCard
          ><div class="story-row">
            <UiBadge>Personal</UiBadge
            ><UiBadge tone="success">Available offline</UiBadge
            ><UiBadge tone="warning">Update ready</UiBadge>
          </div>
          <h2>Every idea starts somewhere.</h2>
          <p>A card provides a quiet home for related content.</p></UiCard
        >
      </div></Variant
    ><Variant title="Empty state"
      ><UiEmptyState
        title="Make room for your first idea"
        description="Capture something worth keeping. Your notes stay on this device."
        ><template #icon><NotebookPen :size="24" /></template
        ><UiButton>Write a note</UiButton></UiEmptyState
      ></Variant
    ><Variant title="Notifications"
      ><div class="story-layout">
        <UiToast
          v-if="visible"
          message="Your note is saved."
          @dismiss="visible = false"
        /><UiButton v-else variant="secondary" @click="visible = true"
          >Show notification</UiButton
        ><UiToast
          tone="error"
          message="We couldn't save your note. Your draft is still here."
        /></div></Variant
  ></Story>
</template>

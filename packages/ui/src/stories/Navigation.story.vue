<script setup lang="ts">
import { ref } from 'vue'
import { NotebookPen, Settings } from '@lucide/vue'
import { AppNavigation, AppShell, UiBadge, UiCard } from '../index'
const active = ref('notes')
const items = [
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'settings', label: 'Settings', icon: Settings },
]
</script>
<template>
  <Story
    title="Patterns / Application shell"
    :layout="{ type: 'single', iframe: true }"
    ><Variant title="Responsive navigation"
      ><AppShell
        ><template #header
          ><strong>Fieldnotes</strong
          ><UiBadge tone="success">Local first</UiBadge></template
        >
        <h1>{{ active === 'notes' ? 'Your notes' : 'Settings' }}</h1>
        <UiCard
          >Mobile navigation uses a full-width bottom bar with icon-only
          actions. Desktop navigation keeps visible labels at the top.</UiCard
        ><template #navigation
          ><AppNavigation
            v-model="active"
            :items="items" /></template></AppShell></Variant
  ></Story>
</template>

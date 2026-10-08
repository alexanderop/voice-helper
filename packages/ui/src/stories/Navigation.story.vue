<script setup lang="ts">
import { ref } from 'vue'
import { Mic, LineChart } from '@lucide/vue'
import { AppNavigation, AppShell, UiBadge, UiCard } from '../index'
const active = ref('today')
const items = [
  { id: 'today', label: 'Today', icon: Mic },
  { id: 'progress', label: 'Progress', icon: LineChart },
]
</script>
<template>
  <Story
    title="Patterns / Application shell"
    :layout="{ type: 'single', iframe: true }"
    ><Variant title="Responsive navigation"
      ><AppShell
        ><template #header
          ><strong>Talk Coach</strong
          ><UiBadge tone="success">On device</UiBadge></template
        >
        <h1>
          {{
            active === 'today'
              ? 'One thought. Spoken clearly.'
              : 'A little clearer.'
          }}
        </h1>
        <UiCard
          >Mobile navigation uses a full-width bottom bar with icon-only
          actions. Desktop navigation keeps visible labels at the top.</UiCard
        ><template #navigation
          ><AppNavigation
            v-model="active"
            :items="items" /></template></AppShell></Variant
  ></Story>
</template>

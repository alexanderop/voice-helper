<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LineChart, Mic, Settings2, ShieldCheck, WifiOff } from '@lucide/vue'
import {
  AppShell,
  AppNavigation,
  UiButton,
  UiBadge,
  UiWaveform,
} from '@talk-coach/ui'
import type { ModelStatus } from '../features/speech'
import { usePwa } from '../platform/pwa/usePwa'
import { useTheme } from './useTheme'

const { modelStatus } = defineProps<{
  modelStatus: { readonly value: ModelStatus }
}>()
const route = useRoute()
const router = useRouter()
const busy = ref(false)
const { theme, setTheme } = useTheme()
const pwa = usePwa(busy)
const items = [
  { id: 'today', label: 'Today', icon: Mic },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]
const settingsProps = computed(() =>
  route.name === 'settings' ? { theme: theme.value, setTheme, pwa } : {},
)
const active = computed(() =>
  route.name === 'result' ? 'progress' : String(route.name ?? 'today'),
)
const offlineReady = computed(
  () => modelStatus.value.status === 'ready' && modelStatus.value.offline,
)
function navigate(id: string) {
  if (route.name === id) {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return
  }
  void router.push({ name: id })
}
</script>
<template>
  <AppShell>
    <template #header>
      <a
        :href="router.resolve({ name: 'today' }).href"
        class="brand"
        @click.prevent="navigate('today')"
        ><span class="brand-mark" aria-hidden="true"
          ><UiWaveform :bars="5" /></span
        >Talk Coach</a
      >
      <UiBadge v-if="!pwa.online.value && !offlineReady" tone="warning"
        ><WifiOff :size="14" aria-hidden="true" />Offline</UiBadge
      >
      <UiBadge v-else-if="offlineReady" tone="success" data-testid="app-status"
        ><ShieldCheck :size="14" aria-hidden="true" />Offline · ready</UiBadge
      >
      <UiBadge v-else data-testid="app-status"
        ><ShieldCheck :size="14" aria-hidden="true" />On device</UiBadge
      >
    </template>
    <template #navigation
      ><AppNavigation
        :items="items"
        :model-value="active"
        @update:model-value="navigate"
    /></template>
    <RouterView v-slot="{ Component }"
      ><component :is="Component" v-bind="settingsProps"
    /></RouterView>
    <aside
      v-if="pwa.updateAvailable.value && !pwa.deferred.value"
      class="update-notice"
      aria-label="App update"
    >
      <p><strong>A new version is ready.</strong> Your drills stay here.</p>
      <div class="update-actions">
        <UiButton
          variant="ghost"
          size="sm"
          :disabled="pwa.updating.value"
          @click="pwa.deferred.value = true"
          >Later</UiButton
        ><UiButton size="sm" :loading="pwa.updating.value" @click="pwa.update"
          >Update now</UiButton
        >
      </div>
    </aside>
  </AppShell>
</template>

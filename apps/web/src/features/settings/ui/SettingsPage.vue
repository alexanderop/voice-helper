<script setup lang="ts">
import { ref } from 'vue'
import { matchError, type Result } from '@talk-coach/result'
import type { StorageWriteError } from '@talk-coach/composables'
import { Monitor, Moon, Sun, RefreshCw } from '@lucide/vue'
import { UiButton, UiCard, UiBadge } from '@talk-coach/ui'
import type {
  AppCapabilities,
  DataCapabilities,
  ReadDiagnostics,
  Theme,
} from '../ports/settings'
import DataPanel from './DataPanel.vue'
import DiagnosticsPanel from './DiagnosticsPanel.vue'

const { theme, setTheme, pwa, data, readDiagnostics } = defineProps<{
  theme: Theme
  setTheme: (theme: Theme) => Result<void, StorageWriteError>
  pwa: AppCapabilities
  data: DataCapabilities
  readDiagnostics: ReadDiagnostics
}>()
const themeMessage = ref('')
function chooseTheme(next: Theme) {
  themeMessage.value = setTheme(next).match({
    ok: () => '',
    err: (error) =>
      matchError(error, {
        StorageQuotaExceeded: () =>
          'Storage is full. This theme lasts until you close the app.',
        StorageUnavailable: () =>
          'This browser blocks saving. This theme lasts until you close the app.',
      }),
  })
}
const version = /^[a-f0-9]{40}$/.test(__APP_VERSION__)
  ? __APP_VERSION__.slice(0, 7)
  : __APP_VERSION__
const themes = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const
</script>
<template>
  <section class="page settings-page" aria-labelledby="settings-title">
    <p class="eyebrow">Settings</p>
    <h1 id="settings-title" class="display-title">Make it yours.</h1>
    <UiCard element="section" class="settings-card"
      ><h2 class="section-heading">Appearance</h2>
      <fieldset class="theme-picker">
        <legend class="sr-only">Theme</legend>
        <label
          v-for="item in themes"
          :key="item.value"
          :class="{ selected: theme === item.value }"
          ><input
            type="radio"
            name="theme"
            :value="item.value"
            :checked="theme === item.value"
            @change="chooseTheme(item.value)"
          /><component :is="item.icon" :size="20" aria-hidden="true" /><span>{{
            item.label
          }}</span></label
        >
      </fieldset>
      <p role="status" class="status-line" data-testid="theme-status">
        {{ themeMessage }}
      </p></UiCard
    >
    <DataPanel :data="data" />
    <DiagnosticsPanel :read-diagnostics="readDiagnostics" />
    <UiCard element="section" class="settings-card"
      ><h2 class="section-heading">On your Home Screen</h2>
      <p v-if="pwa.installed.value">Talk Coach is installed on this device.</p>
      <UiButton
        v-else-if="pwa.canInstall.value"
        variant="secondary"
        @click="pwa.install"
        >Install Talk Coach</UiButton
      >
      <ol v-else class="install-steps">
        <li>On iPhone, open this page in Safari.</li>
        <li>Tap Share, then Add to Home Screen.</li>
        <li>Open Talk Coach from your Home Screen.</li>
      </ol>
      <p class="settings-row">
        <span class="muted">Version {{ version }}</span
        ><UiBadge :tone="pwa.offlineReady.value ? 'success' : 'neutral'">{{
          pwa.offlineReady.value ? 'App saved offline' : 'Preparing offline use'
        }}</UiBadge>
      </p>
      <UiButton
        variant="secondary"
        :loading="pwa.checking.value"
        @click="pwa.checkForUpdates"
        ><RefreshCw :size="16" aria-hidden="true" />Check for updates</UiButton
      >
      <p role="status" class="status-line">{{ pwa.status.value }}</p></UiCard
    >
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { matchError, type Result } from '@talk-coach/result'
import type { StorageWriteError } from '@talk-coach/composables'
import {
  Download,
  Monitor,
  Moon,
  Sun,
  RefreshCw,
  ShieldCheck,
} from '@lucide/vue'
import { UiButton, UiCard, UiBadge } from '@talk-coach/ui'
import type { Theme, AppCapabilities } from '../ports/settings'
const { theme, setTheme, pwa } = defineProps<{
  theme: Theme
  setTheme: (theme: Theme) => Result<void, StorageWriteError>
  pwa: AppCapabilities
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
function detectPlatform() {
  const touchMac =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || touchMac) return 'ios'
  if (/Android/.test(navigator.userAgent)) return 'android'
  return 'desktop'
}
const installPlatform = detectPlatform()
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
    <div class="page-heading">
      <div>
        <p class="eyebrow">MAKE YOURSELF AT HOME</p>
        <h1 id="settings-title">A little more you.</h1>
        <p class="page-description">Your space, just the way you like it.</p>
      </div>
    </div>
    <UiCard class="settings-card"
      ><h2>Appearance</h2>
      <p class="muted">Choose a theme that feels right.</p>
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
          /><component :is="item.icon" :size="22" aria-hidden="true" /><span>{{
            item.label
          }}</span></label
        >
      </fieldset>
      <p role="status" class="muted" data-testid="theme-status">
        {{ themeMessage }}
      </p></UiCard
    >
    <UiCard class="settings-card"
      ><div class="settings-row">
        <div>
          <h2>Always close by</h2>
          <p class="muted">Give your thoughts a home on your device.</p>
        </div>
        <Download :size="22" aria-hidden="true" />
      </div>
      <p v-if="pwa.installed.value">Talk Coach is installed on this device.</p>
      <UiButton v-else-if="pwa.canInstall.value" @click="pwa.install"
        >Install Talk Coach</UiButton
      >
      <div v-else class="install-help">
        <p>
          Installation depends on your browser. Choose your device for help.
        </p>
        <details :open="installPlatform === 'ios'">
          <summary>iPhone or iPad</summary>
          <ol>
            <li>Open this page in Safari.</li>
            <li>
              Tap Share, then Add to Home Screen. You may need to scroll through
              the actions.
            </li>
            <li>Tap Add, then open Talk Coach from your Home Screen.</li>
          </ol>
        </details>
        <details :open="installPlatform === 'android'">
          <summary>Android</summary>
          <ol>
            <li>Open this page in Chrome.</li>
            <li>
              Open the browser menu and choose Install app or Add to Home
              screen.
            </li>
            <li>
              Follow the browser instructions. The wording can vary by device.
            </li>
          </ol>
        </details>
        <details :open="installPlatform === 'desktop'">
          <summary>Computer</summary>
          <p>
            In Chrome or Edge, look for the install icon in the address bar or
            Install in the browser menu. In Safari on a supported Mac, choose
            File → Add to Dock.
          </p>
          <p>
            If your browser offers no installation option, you can still use
            Talk Coach in a tab.
          </p>
        </details>
      </div></UiCard
    >
    <UiCard class="settings-card"
      ><div class="settings-row">
        <div>
          <h2>Ready when you are</h2>
          <p class="muted">
            {{
              pwa.offlineReady.value
                ? 'The app is saved for offline use.'
                : 'Open the production app online once to prepare offline use.'
            }}
          </p>
        </div>
        <UiBadge :tone="pwa.offlineReady.value ? 'success' : 'neutral'">{{
          pwa.offlineReady.value ? 'Offline ready' : 'Preparing'
        }}</UiBadge>
      </div>
      <div class="settings-row update-row">
        <span class="muted">Version {{ version }}</span
        ><UiButton
          variant="secondary"
          :loading="pwa.checking.value"
          @click="pwa.checkForUpdates"
          ><RefreshCw :size="16" aria-hidden="true" />Check for
          updates</UiButton
        >
      </div>
      <p role="status" class="muted">
        {{ pwa.status.value }}
      </p></UiCard
    >
    <div class="privacy-note">
      <ShieldCheck :size="19" aria-hidden="true" />
      <p>
        Your drills stay in this browser. No accounts, tracking, or cloud sync.
        Clearing browser data removes them.
      </p>
    </div>
  </section>
</template>

<style scoped>
.install-help details {
  margin-top: 12px;
}
.install-help summary {
  cursor: pointer;
  color: var(--color-foreground);
  font-weight: 600;
  padding-block: 8px;
}
.install-help ol {
  padding-left: 24px;
  margin: 8px 0;
}
.install-help li + li {
  margin-top: 8px;
}
</style>

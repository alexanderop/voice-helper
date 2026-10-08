<script setup lang="ts">
import { onUnmounted, ref, useTemplateRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { matchError, type Result } from '@starter/result'
import { useEventListener, type StorageWriteError } from '@starter/composables'
import type {
  BackupExportError,
  BackupImportError,
  NotesService,
} from '../../notes'
import {
  Download,
  Monitor,
  Moon,
  Sun,
  RefreshCw,
  ShieldCheck,
} from '@lucide/vue'
import { UiButton, UiCard, UiBadge } from '@starter/ui'
import type { Theme, AppCapabilities } from '../ports/settings'
const { theme, setTheme, pwa, service } = defineProps<{
  theme: Theme
  setTheme: (theme: Theme) => Result<void, StorageWriteError>
  pwa: AppCapabilities
  service: NotesService
}>()
const emit = defineEmits<{
  'busy-change': [busy: boolean]
}>()
const backupBusy = ref(false)
const backupMessage = ref('')
const backupError = ref('')
const importFile = useTemplateRef<HTMLInputElement>('import-file')
onBeforeRouteLeave(() => !backupBusy.value)
function protectBackup(event: BeforeUnloadEvent) {
  if (!backupBusy.value) return
  event.preventDefault()
  event.returnValue = ''
}
useEventListener(window, 'beforeunload', protectBackup)
onUnmounted(() => {
  emit('busy-change', false)
})
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

function startBackup() {
  backupBusy.value = true
  backupMessage.value = ''
  backupError.value = ''
  emit('busy-change', true)
}
function finishBackup() {
  backupBusy.value = false
  emit('busy-change', false)
}
const plural = (count: number) => `${count} ${count === 1 ? 'note' : 'notes'}`

const exportErrorMessage = (error: BackupExportError) =>
  matchError(error, {
    CollectionTooLarge: () =>
      'This collection exceeds the backup limit of 5,000 notes or 10 MB. No backup was downloaded. Your notes are unchanged.',
    BackupStorageFailed: ({ failure }) => failure.message,
  })

const importErrorMessage = (error: BackupImportError) =>
  matchError(error, {
    BackupFileTooLarge: () => 'Choose a backup smaller than 10 MB.',
    BackupUnreadable: () =>
      'This file is not readable JSON. Choose a Fieldnotes backup.',
    InvalidBackup: () =>
      'Choose a valid Fieldnotes version 1 backup with no more than 5,000 notes.',
    BackupStorageFailed: ({ failure }) => failure.message,
  })

function download(json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `fieldnotes-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function exportBackup() {
  startBackup()
  try {
    ;(await service.exportBackup()).match({
      ok: ({ json, count }) => {
        download(json)
        backupMessage.value = `Backup download started: ${plural(count)}, including trash. Keep it somewhere safe.`
      },
      err: (error) => {
        backupError.value = exportErrorMessage(error)
      },
    })
  } catch {
    backupError.value = 'The backup could not be downloaded. Please try again.'
  } finally {
    finishBackup()
  }
}
async function importBackup(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const file = input.files?.[0]
  if (!file) return
  startBackup()
  try {
    ;(await service.importBackup(file)).match({
      ok: (count) => {
        backupMessage.value = `Imported ${plural(count)} as new copies. Existing notes were kept. Trashed notes are in Trash.`
      },
      err: (error) => {
        backupError.value = importErrorMessage(error)
      },
    })
  } catch {
    backupError.value = 'The backup could not be imported. Please try again.'
  } finally {
    input.value = ''
    finishBackup()
  }
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
      <p v-if="pwa.installed.value">Fieldnotes is installed on this device.</p>
      <UiButton v-else-if="pwa.canInstall.value" @click="pwa.install"
        >Install Fieldnotes</UiButton
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
            <li>Tap Add, then open Fieldnotes from your Home Screen.</li>
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
            Fieldnotes in a tab.
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
    <UiCard class="settings-card" aria-labelledby="backup-title">
      <h2 id="backup-title">Your notes, with you</h2>
      <p class="muted">
        Download a JSON backup of all your notes, including Trash. Backups are
        plain text; store them somewhere private.
      </p>
      <p class="muted">
        Import a Fieldnotes backup to add new copies. Existing notes are never
        replaced. Importing the same backup twice creates duplicates. Up to
        5,000 notes and 10 MB per file.
      </p>
      <div class="backup-actions">
        <UiButton
          variant="secondary"
          :disabled="backupBusy"
          @click="exportBackup"
          >Export backup</UiButton
        >
        <UiButton
          variant="secondary"
          :disabled="backupBusy"
          @click="importFile?.click()"
          >Import backup</UiButton
        >
        <input
          ref="import-file"
          class="sr-only"
          type="file"
          accept=".json,application/json"
          aria-label="Choose a Fieldnotes backup"
          :disabled="backupBusy"
          tabindex="-1"
          @change="importBackup"
        />
      </div>
      <p role="status" data-testid="backup-status">
        {{
          backupBusy
            ? 'Working on your backup. Keep this page open until it finishes…'
            : backupMessage
        }}
      </p>
      <p v-if="backupError" role="alert" class="backup-error">
        {{ backupError }}
      </p>
    </UiCard>
    <div class="privacy-note">
      <ShieldCheck :size="19" aria-hidden="true" />
      <p>
        Your notes stay in this browser. No accounts, tracking, or cloud sync.
        Clearing browser data removes your notes.
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
.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}
.backup-error {
  color: var(--color-danger);
}
</style>

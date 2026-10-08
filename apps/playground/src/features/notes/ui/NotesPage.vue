<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useDocumentVisibility, useEventListener } from '@starter/composables'
import { onBeforeRouteLeave } from 'vue-router'
import {
  ArrowUpRight,
  FileText,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Trash2,
} from '@lucide/vue'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDialog,
  UiEmptyState,
  UiIconButton,
  UiInput,
  UiTextarea,
  UiToast,
} from '@starter/ui'
import type { Note, NotesService } from '../index'
import { useNotesSearch } from './useNotesSearch'

const { service } = defineProps<{ service: NotesService }>()
const emit = defineEmits<{ 'busy-change': [busy: boolean] }>()
const notes = ref<readonly Note[]>([])
const loading = ref(true)
const pending = ref(false)
const query = useNotesSearch(service)
const trash = ref<readonly Note[]>([])
const showingTrash = ref(false)
const undoNote = ref<Note | null>(null)
const fieldErrors = ref<{ title?: string; body?: string }>({})
const conflict = ref(false)
const latest = ref<Note | null>(null)
const reviewed = ref(false)
const editor = ref<{ original: Note | null } | null>(null)
const title = ref('')
const body = ref('')
const error = ref('')
const refreshError = ref('')
const toast = ref('')
const deleting = ref<Note | null>(null)
let readVersion = 0
let mounted = true
const dirty = computed(
  () =>
    editor.value !== null &&
    (title.value !== (editor.value.original?.title ?? '') ||
      body.value !== (editor.value.original?.body ?? '')),
)
const busy = computed(() => dirty.value || pending.value)
watch(busy, (value) => emit('busy-change', value), {
  immediate: true,
  flush: 'sync',
})
const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  return (showingTrash.value ? trash.value : notes.value)
    .filter((note) =>
      `${note.title}\n${note.body}`.toLocaleLowerCase().includes(needle),
    )
    .toSorted(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
    )
})
const pinned = computed(() => filtered.value.filter((note) => note.pinned))
const ordinary = computed(() => filtered.value.filter((note) => !note.pinned))
const groups = computed(() =>
  [
    { label: 'Pinned', notes: pinned.value },
    {
      label: pinned.value.length ? 'Everything else' : 'Your notes',
      notes: ordinary.value,
    },
  ].filter((group) => group.notes.length),
)
const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
    timestamp,
  )

async function refresh() {
  const version = ++readVersion
  const result = await service.list()
  if (!mounted || version !== readVersion) return
  loading.value = false
  if (result.isOk()) {
    notes.value = result.value
    refreshError.value = ''
    const deleted = await service.listTrash()
    if (deleted.isOk() && mounted && version === readVersion)
      trash.value = deleted.value
  } else refreshError.value = result.error.message
}
function open(note: Note | null = null) {
  editor.value = { original: note }
  title.value = note?.title ?? ''
  body.value = note?.body ?? ''
  fieldErrors.value = {}
  conflict.value = false
  reviewed.value = false
  latest.value = null
  error.value = ''
}
function close() {
  if (pending.value) return
  if (dirty.value && !window.confirm('Discard your unsaved changes?')) return
  editor.value = null
  error.value = ''
}
async function reviewLatest() {
  const result = await service.exportData()
  if (result.isErr()) {
    error.value = result.error.message
    return
  }
  latest.value =
    result.value.find((note) => note.id === editor.value?.original?.id) ?? null
  reviewed.value = true
}
async function saveCopy() {
  await save('copy')
}
async function replaceLatest() {
  await save('replace')
}
function revisionBase(mode: 'normal' | 'copy' | 'replace' | Event) {
  if (mode === 'copy') return null
  if (mode === 'replace') return latest.value
  return editor.value?.original ?? null
}
async function showFieldError(field: 'title' | 'body', message: string) {
  fieldErrors.value = { [field]: message }
  await nextTick()
  document.getElementById(`note-${field}`)?.focus()
}
async function save(mode: 'normal' | 'copy' | 'replace' | Event = 'normal') {
  if (!editor.value || pending.value) return
  pending.value = true
  readVersion++
  error.value = ''
  fieldErrors.value = {}
  const original = revisionBase(mode)
  if (
    mode === 'replace' &&
    (!latest.value || latest.value.deletedAt !== undefined)
  ) {
    pending.value = false
    return
  }
  const draft = { title: title.value, body: body.value }
  const result = original
    ? await service.edit(original, draft)
    : await service.create(draft)
  pending.value = false
  if (result.isErr()) {
    error.value = result.error.message
    conflict.value = result.error.kind === 'conflict'
    if (result.error.field)
      await showFieldError(result.error.field, result.error.message)
    return
  }
  notes.value = [
    ...notes.value.filter((note) => note.id !== result.value.id),
    result.value,
  ]
  editor.value = null
  undoNote.value = null
  toast.value = 'Note saved.'
  await refresh()
}
async function pin(note: Note) {
  if (pending.value) return
  pending.value = true
  readVersion++
  const result = await service.setPinned(note, !note.pinned)
  pending.value = false
  if (result.isErr()) {
    refreshError.value = result.error.message
    return
  }
  notes.value = notes.value.map((item) =>
    item.id === note.id ? result.value : item,
  )
  await refresh()
}
function requestDelete(note: Note) {
  deleting.value = note
  error.value = ''
}
async function remove() {
  const note = deleting.value
  if (!note || pending.value) return
  pending.value = true
  readVersion++
  const result = showingTrash.value
    ? await service.remove(note)
    : await service.trash(note)
  pending.value = false
  if (result.isErr()) {
    error.value = result.error.message
    return
  }
  deleting.value = null
  notes.value = notes.value.filter((item) => item.id !== note.id)
  undoNote.value = !showingTrash.value && result.value ? result.value : null
  toast.value = showingTrash.value
    ? 'Note permanently deleted.'
    : 'Note moved to Trash.'
  await refresh()
}
async function restore(note: Note) {
  if (pending.value) return
  pending.value = true
  const result = await service.restore(note)
  pending.value = false
  if (result.isErr()) {
    refreshError.value = result.error.message
    return
  }
  undoNote.value = null
  toast.value = 'Note restored.'
  await refresh()
}
function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void save()
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (busy.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
// `focus` and `visibilitychange` both fire on tab switch or PWA resume.
let resumeRefreshing = false
function focusRefresh() {
  if (pending.value || resumeRefreshing) return
  resumeRefreshing = true
  void refresh().finally(() => {
    resumeRefreshing = false
  })
}
useEventListener(window, 'beforeunload', beforeUnload)
useEventListener(window, 'focus', focusRefresh)
const visibility = useDocumentVisibility()
watch(visibility, (value) => {
  if (value === 'visible') focusRefresh()
})
onBeforeRouteLeave(() => {
  if (pending.value) return false
  return !dirty.value || window.confirm('Discard your unsaved changes?')
})
onMounted(() => {
  void refresh()
})
onUnmounted(() => {
  mounted = false
  readVersion++
  emit('busy-change', false)
})
</script>
<template>
  <section class="page notes-page" aria-labelledby="notes-title">
    <div class="page-heading">
      <div>
        <p class="eyebrow">A PLACE TO BEGIN</p>
        <h1 id="notes-title">Make room for a thought.</h1>
        <p class="page-description">
          Ideas, reminders, and the things worth keeping.
        </p>
      </div>
      <UiButton class="new-note-button" @click="open()"
        ><Plus :size="17" aria-hidden="true" />New note</UiButton
      >
    </div>
    <div class="notes-toolbar">
      <div class="search-field">
        <Search :size="17" aria-hidden="true" /><UiInput
          v-model="query"
          label="Search notes"
          type="search"
          placeholder="Find a thought…"
        />
      </div>
      <UiButton variant="ghost" @click="showingTrash = !showingTrash">{{
        showingTrash ? 'Back to notes' : `Trash (${trash.length})`
      }}</UiButton>
      <span class="note-count"
        >{{ notes.length }} {{ notes.length === 1 ? 'note' : 'notes' }}</span
      >
    </div>
    <div v-if="refreshError" class="inline-error" role="alert">
      <span>{{ refreshError }}</span
      ><UiButton size="sm" variant="secondary" @click="refresh"
        >Try again</UiButton
      >
    </div>
    <p v-if="loading" class="loading-state" role="status">
      Opening your notebook…
    </p>
    <UiEmptyState
      v-else-if="!notes.length && !showingTrash && !refreshError"
      class="notebook-empty"
      title="Good things start with a blank page."
      description="A passing idea. A small reminder. Something just for you. Give it a place to land."
      ><template #icon
        ><div class="empty-art" aria-hidden="true">
          <div class="paper-back" />
          <div class="paper-front">
            <NotebookPen :size="30" stroke-width="1.3" /><i /><i /><i />
          </div>
          <span class="sparkle sparkle-one">✦</span
          ><span class="sparkle sparkle-two">✧</span>
        </div></template
      ><UiButton variant="secondary" @click="open()"
        >Write your first note<ArrowUpRight
          :size="16"
          aria-hidden="true" /></UiButton
      ><span class="empty-footnote"
        >Saved on your device. Always yours.</span
      ></UiEmptyState
    >
    <UiEmptyState
      v-else-if="!filtered.length && !refreshError"
      :title="
        showingTrash && !trash.length ? 'Trash is empty.' : 'No thoughts found.'
      "
      description="Try a different word, or start a new note."
      ><template #icon><Search :size="28" aria-hidden="true" /></template
      ><UiButton variant="ghost" @click="query = ''"
        >Clear search</UiButton
      ></UiEmptyState
    >
    <div v-for="group in groups" :key="group.label" class="note-group">
      <h2 class="section-label">
        <Pin v-if="group.label === 'Pinned'" :size="13" aria-hidden="true" />{{
          group.label
        }}<span>{{ group.notes.length }}</span>
      </h2>
      <div class="notes-grid">
        <UiCard v-for="note in group.notes" :key="note.id" class="note-card"
          ><button
            class="note-open"
            :aria-label="`Edit ${note.title}`"
            :disabled="showingTrash"
            @click="open(note)"
          >
            <div class="note-card-top">
              <FileText :size="16" aria-hidden="true" /><UiBadge
                v-if="note.pinned"
                >Pinned</UiBadge
              >
            </div>
            <h3>{{ note.title }}</h3>
            <p>{{ note.body || 'A little space to come back to.' }}</p>
          </button>
          <div class="note-card-footer">
            <time :datetime="new Date(note.updatedAt).toISOString()">{{
              formatDate(note.updatedAt)
            }}</time>
            <div class="note-actions">
              <UiButton
                v-if="showingTrash"
                size="sm"
                variant="secondary"
                @click="restore(note)"
                >Restore</UiButton
              >
              <UiIconButton
                v-else
                :label="`${note.pinned ? 'Unpin' : 'Pin'} ${note.title}`"
                :disabled="pending"
                @click="pin(note)"
                ><Pin
                  :size="15"
                  :fill="note.pinned ? 'currentColor' : 'none'" /></UiIconButton
              ><UiIconButton
                :label="`Delete ${note.title}`"
                :disabled="pending"
                @click="requestDelete(note)"
                ><Trash2 :size="15"
              /></UiIconButton>
            </div></div
        ></UiCard>
      </div>
    </div>
    <UiDialog
      :open="editor !== null"
      :title="editor?.original ? 'Edit note' : 'New note'"
      description="A little space for whatever is on your mind."
      @update:open="
        (value) => {
          if (!value) close()
        }
      "
      ><form
        id="note-form"
        class="note-form"
        @submit.prevent="save"
        @keydown="shortcut"
      >
        <UiInput
          id="note-title"
          v-model="title"
          :error="fieldErrors.title"
          label="Title"
          placeholder="Give your thought a name"
          maxlength="120"
          :disabled="pending"
          autofocus
        /><UiTextarea
          id="note-body"
          v-model="body"
          :error="fieldErrors.body"
          label="Note"
          placeholder="Start anywhere…"
          rows="9"
          :disabled="pending"
        />
        <p
          v-if="error && !fieldErrors.title && !fieldErrors.body"
          class="form-error"
          role="alert"
        >
          {{ error }}
        </p>
        <div v-if="conflict" class="conflict-recovery">
          <p>
            Your draft is still here. Save a separate note, or review the latest
            saved version before replacing it.
          </p>
          <UiButton variant="secondary" :disabled="pending" @click="saveCopy"
            >Save as a new note</UiButton
          >
          <UiButton variant="ghost" :disabled="pending" @click="reviewLatest"
            >Review latest version</UiButton
          >
          <div v-if="reviewed" class="latest-note">
            <template v-if="latest && latest.deletedAt === undefined"
              ><h3>Latest saved version</h3>
              <strong>{{ latest.title }}</strong>
              <p class="latest-body">{{ latest.body }}</p>
              <UiButton
                variant="secondary"
                :disabled="pending"
                @click="replaceLatest"
                >Replace latest with my draft</UiButton
              ></template
            >
            <p v-else>
              This note was deleted. Save your draft as a new note to keep it.
            </p>
          </div>
        </div>
      </form>
      <template #footer
        ><span class="editor-hint">{{
          dirty ? 'Unsaved changes' : 'Stored on this device'
        }}</span
        ><UiButton variant="ghost" :disabled="pending" @click="close"
          >Cancel</UiButton
        ><UiButton type="submit" form="note-form" :loading="pending"
          >Save note</UiButton
        ></template
      ></UiDialog
    >
    <UiDialog
      :open="deleting !== null"
      :title="
        showingTrash
          ? 'Permanently delete this note?'
          : 'Move this note to Trash?'
      "
      :description="
        showingTrash
          ? 'This cannot be undone. Export a backup first if you want to keep it.'
          : 'You can restore this note from Trash at any time.'
      "
      @update:open="
        (value) => {
          if (!value && !pending) deleting = null
        }
      "
      ><p class="delete-preview">{{ deleting?.title }}</p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <template #footer
        ><UiButton variant="ghost" :disabled="pending" @click="deleting = null"
          >Keep note</UiButton
        ><UiButton variant="danger" :loading="pending" @click="remove">{{
          showingTrash ? 'Permanently delete' : 'Delete note'
        }}</UiButton></template
      ></UiDialog
    >
    <div v-if="toast" class="toast-position">
      <UiButton
        v-if="undoNote"
        variant="secondary"
        :disabled="pending"
        @click="restore(undoNote)"
        >Undo</UiButton
      >
      <UiToast :message="toast" @dismiss="toast = ''" />
    </div>
  </section>
</template>

<style scoped>
.conflict-recovery {
  display: grid;
  gap: 0.75rem;
}
.latest-note {
  border: 1px solid var(--color-border);
  padding: 1rem;
  border-radius: 1rem;
  min-width: 0;
}
.latest-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 12rem;
  overflow: auto;
}
</style>

<script setup lang="ts">
import { ref, useId } from 'vue'
import { X } from '@lucide/vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import UiIconButton from './UiIconButton.vue'
const { title, description, fallbackFocus } = defineProps<{
  title: string
  description?: string
  fallbackFocus?: string
}>()
defineSlots<{ default(): unknown; footer?(): unknown }>()
const open = defineModel<boolean>('open', { default: false })
const descriptionId = useId()
const returnFocus = ref<HTMLElement>()
function captureFocus() {
  if (document.activeElement instanceof HTMLElement)
    returnFocus.value = document.activeElement
}
function restoreFocus(event: Event) {
  const target = returnFocus.value?.isConnected
    ? returnFocus.value
    : document.querySelector<HTMLElement>(
        fallbackFocus ?? 'main[tabindex="-1"]',
      )
  if (target) {
    event.preventDefault()
    target.focus({ preventScroll: true })
  }
}
const dragOffset = ref(0)
let dragStart: number | undefined
function startDrag(event: PointerEvent) {
  if (event.button !== 0 || !matchMedia('(max-width: 767px)').matches) return
  dragStart = event.clientY
  if (event.currentTarget instanceof HTMLElement)
    event.currentTarget.setPointerCapture(event.pointerId)
}
function moveDrag(event: PointerEvent) {
  if (dragStart !== undefined)
    dragOffset.value = Math.max(0, event.clientY - dragStart)
}
function endDrag() {
  const dismiss = dragOffset.value >= 80
  dragStart = undefined
  dragOffset.value = 0
  if (dismiss) open.value = false
}
function cancelDrag() {
  dragStart = undefined
  dragOffset.value = 0
}
</script>
<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="ui-dialog-overlay" />
      <DialogContent
        class="ui-dialog"
        :style="
          dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined
        "
        :aria-describedby="description ? descriptionId : undefined"
        @open-auto-focus="captureFocus"
        @close-auto-focus="restoreFocus"
      >
        <div
          class="ui-dialog__handle"
          aria-hidden="true"
          @pointerdown="startDrag"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="cancelDrag"
        />
        <header class="ui-dialog__header">
          <div>
            <DialogTitle class="ui-dialog__title">{{ title }}</DialogTitle
            ><DialogDescription
              v-if="description"
              :id="descriptionId"
              class="ui-dialog__description"
              >{{ description }}</DialogDescription
            >
          </div>
          <DialogClose as-child
            ><UiIconButton label="Close dialog"><X :size="20" /></UiIconButton
          ></DialogClose>
        </header>
        <div class="ui-dialog__body"><slot /></div>
        <footer v-if="$slots.footer" class="ui-dialog__footer">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import UiButton from './UiButton.vue'
const {
  label,
  variant = 'ghost',
  disabled = false,
} = defineProps<{
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
}>()
defineSlots<{ icon?(): unknown; default?(): unknown }>()
</script>
<template>
  <UiButton
    size="icon"
    :variant="variant"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    ><slot name="icon"><slot /></slot
  ></UiButton>
</template>

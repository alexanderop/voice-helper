<script setup lang="ts">
const {
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
} = defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>()
defineSlots<{ default(): unknown }>()
</script>
<template>
  <button
    :type="type"
    class="ui-button"
    :class="[`ui-button--${variant}`, `ui-button--${size}`]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="ui-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

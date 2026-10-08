<script setup lang="ts">
const { tone = 'neutral' } = defineProps<{
  tone?: 'neutral' | 'success' | 'warning'
}>()
defineSlots<{ default(): unknown }>()
</script>
<template>
  <span class="ui-badge" :class="`ui-badge--${tone}`"><slot /></span>
</template>

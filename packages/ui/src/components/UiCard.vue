<script setup lang="ts">
const { element = 'article' } = defineProps<{
  element?: 'article' | 'section' | 'div'
}>()
defineSlots<{ default(): unknown }>()
</script>
<template>
  <component :is="element" class="ui-card"><slot /></component>
</template>

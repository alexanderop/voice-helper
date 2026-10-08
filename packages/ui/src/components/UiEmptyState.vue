<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
defineSlots<{ icon?(): unknown; default?(): unknown }>()
</script>
<template>
  <div class="ui-empty-state">
    <div v-if="$slots.icon" class="ui-empty-state__icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.default" class="ui-empty-state__action"><slot /></div>
  </div>
</template>

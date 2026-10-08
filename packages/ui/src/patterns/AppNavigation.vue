<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{
  items: readonly { id: string; label: string; icon: Component }[]
  modelValue: string
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <nav class="ui-navigation" aria-label="Main navigation">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="ui-navigation__item"
      :aria-label="item.label"
      :aria-current="modelValue === item.id ? 'page' : undefined"
      @click="$emit('update:modelValue', item.id)"
    >
      <component :is="item.icon" :size="19" aria-hidden="true" /><span
        class="ui-navigation__label"
        >{{ item.label }}</span
      >
    </button>
  </nav>
</template>

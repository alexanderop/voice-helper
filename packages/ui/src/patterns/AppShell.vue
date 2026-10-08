<script setup lang="ts">
import { useTemplateRef } from 'vue'
defineSlots<{ header(): unknown; default(): unknown; navigation(): unknown }>()
const main = useTemplateRef<HTMLElement>('main-content')
function skipToContent() {
  main.value?.focus()
  main.value?.scrollIntoView({ block: 'start' })
}
</script>
<template>
  <div class="ui-app-shell">
    <a href="#main-content" class="ui-skip-link" @click.prevent="skipToContent"
      >Skip to content</a
    >
    <header class="ui-app-header"><slot name="header" /></header>
    <main
      id="main-content"
      ref="main-content"
      class="ui-app-main"
      tabindex="-1"
    >
      <slot />
    </main>
    <div class="ui-app-navigation"><slot name="navigation" /></div>
  </div>
</template>

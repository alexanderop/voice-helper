<script setup lang="ts">
const { compact = false } = defineProps<{
  /** Thicker strokes and three bars, for sizes under about 40px. */
  compact?: boolean
}>()
</script>
<template>
  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
    <path
      d="M18 12h28a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10H30l-10 8v-8h-2a10 10 0 0 1-10-10V22a10 10 0 0 1 10-10z"
      fill="none"
      stroke="currentColor"
      :stroke-width="compact ? 5 : 4"
      stroke-linejoin="round"
    />
    <template v-if="compact">
      <rect x="24" y="22" width="5" height="14" rx="2.5" />
      <rect x="31" y="19" width="5" height="20" rx="2.5" />
      <rect x="38" y="24" width="5" height="10" rx="2.5" />
    </template>
    <template v-else>
      <rect x="18" y="26" width="4" height="6" rx="2" />
      <rect x="24" y="22" width="4" height="14" rx="2" />
      <rect x="30" y="19" width="4" height="20" rx="2" />
      <rect x="36" y="23" width="4" height="12" rx="2" />
      <rect x="42" y="26" width="4" height="6" rx="2" />
    </template>
  </svg>
</template>

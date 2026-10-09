<script setup lang="ts">
import { computed } from 'vue'

const {
  bars = 36,
  progress,
  variant = 'bars',
} = defineProps<{
  bars?: number
  /** 0 to 1. Bars up to this point take the accent colour. */
  progress?: number | undefined
  variant?: 'bars' | 'dots'
}>()

/** A fixed, speech-like envelope so the mark looks the same on every render. */
const levels = computed(() =>
  Array.from({ length: bars }, (_, index) => {
    const t = index / Math.max(1, bars - 1)
    const envelope = 0.35 + 0.65 * Math.sin(Math.PI * t)
    const texture = 0.55 + 0.45 * Math.abs(Math.sin(index * 2.399))
    return Math.max(0.12, envelope * texture)
  }),
)
const lit = computed(() =>
  progress === undefined ? bars : Math.round(progress * bars),
)
</script>
<template>
  <span
    class="ui-waveform"
    :class="`ui-waveform--${variant}`"
    aria-hidden="true"
  >
    <span
      v-for="(level, index) in levels"
      :key="index"
      class="ui-waveform__bar"
      :class="{ 'ui-waveform__bar--dim': index >= lit }"
      :style="{ '--level': level }"
    />
  </span>
</template>

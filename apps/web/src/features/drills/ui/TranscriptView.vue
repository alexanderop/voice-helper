<script setup lang="ts">
import { computed } from 'vue'
import { findMarks, type Mark } from '../domain/analysis'

const { transcript } = defineProps<{ transcript: string }>()

type Segment = { text: string; mark?: Mark }

const segments = computed(() => {
  const parts: Segment[] = []
  let cursor = 0
  for (const mark of findMarks(transcript)) {
    if (mark.start > cursor)
      parts.push({ text: transcript.slice(cursor, mark.start) })
    parts.push({ text: transcript.slice(mark.start, mark.end), mark })
    cursor = mark.end
  }
  if (cursor < transcript.length) parts.push({ text: transcript.slice(cursor) })
  return parts
})
</script>
<template>
  <p class="transcript">
    <template v-for="(segment, index) in segments" :key="index"
      ><mark v-if="segment.mark" :class="`transcript__${segment.mark.category}`"
        ><span class="sr-only">{{ segment.mark.category }}: </span
        >{{ segment.text }}</mark
      ><template v-else>{{ segment.text }}</template></template
    >
  </p>
  <p class="transcript-legend" aria-hidden="true">
    <span><span class="legend-filler" />Filler</span
    ><span><span class="legend-hedge" />Hedge</span>
  </p>
</template>
<style scoped>
.transcript {
  font-size: 0.9375rem;
  line-height: 1.85;
  overflow-wrap: anywhere;
}
mark {
  color: inherit;
  background: var(--highlight);
  padding: 1px 3px;
  border-radius: 3px;
  text-decoration-color: var(--accent);
  text-underline-offset: 4px;
  text-decoration-thickness: 2px;
}
.transcript__filler {
  text-decoration-line: underline;
  text-decoration-style: solid;
}
.transcript__hedge {
  text-decoration-line: underline;
  text-decoration-style: dotted;
}
.transcript-legend {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  font-size: 0.75rem;
  color: var(--muted);
}
.transcript-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend-filler,
.legend-hedge {
  width: 18px;
  height: 0;
  border-top: 2px solid var(--accent);
}
.legend-hedge {
  border-top-style: dotted;
}
@media (forced-colors: active) {
  mark {
    forced-color-adjust: none;
    background: Mark;
    color: MarkText;
  }
}
</style>

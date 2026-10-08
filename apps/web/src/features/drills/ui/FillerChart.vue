<script setup lang="ts">
import { computed } from 'vue'
import type { TrendPoint } from '../domain/practice'

const { points } = defineProps<{ points: readonly TrendPoint[] }>()

const WIDTH = 320
const HEIGHT = 140
const PAD = 16

const dateLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })

const chart = computed(() => {
  const max = Math.max(1, ...points.map((point) => point.fillers))
  const step = points.length > 1 ? (WIDTH - PAD * 2) / (points.length - 1) : 0
  const coordinates = points.map((point, index) => ({
    ...point,
    x: PAD + index * step,
    y: HEIGHT - PAD - (point.fillers / max) * (HEIGHT - PAD * 2),
  }))
  return {
    coordinates,
    line: coordinates.map(({ x, y }) => `${x},${y}`).join(' '),
    description: points
      .map(
        (point, index) =>
          `Drill ${index + 1}, ${dateLabel(point.recordedAt)}: ${point.fillers} fillers`,
      )
      .join('. '),
  }
})
</script>
<template>
  <svg
    class="filler-chart"
    :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
    role="img"
    aria-labelledby="filler-chart-title filler-chart-desc"
  >
    <title id="filler-chart-title">Fillers per drill, oldest to newest</title>
    <desc id="filler-chart-desc">{{ chart.description }}.</desc>
    <line
      :x1="PAD"
      :x2="WIDTH - PAD"
      :y1="HEIGHT - PAD"
      :y2="HEIGHT - PAD"
      class="filler-chart__axis"
    />
    <polyline
      v-if="chart.coordinates.length > 1"
      :points="chart.line"
      class="filler-chart__line"
    />
    <g v-for="point in chart.coordinates" :key="point.id">
      <circle :cx="point.x" :cy="point.y" r="4" class="filler-chart__dot" />
      <text :x="point.x" :y="point.y - 10" class="filler-chart__label">
        {{ point.fillers }}
      </text>
    </g>
  </svg>
</template>
<style scoped>
.filler-chart {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.filler-chart__axis {
  stroke: var(--line);
  stroke-dasharray: 3 4;
}
.filler-chart__line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.5;
}
.filler-chart__dot {
  fill: var(--accent);
  stroke: var(--bg);
  stroke-width: 2;
}
.filler-chart__label {
  fill: var(--ink);
  font-family: var(--font-display);
  font-size: 11px;
  text-anchor: middle;
}
</style>

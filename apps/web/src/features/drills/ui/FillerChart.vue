<script setup lang="ts">
import { computed } from 'vue'
import type { TrendPoint } from '../domain/practice'

const { points } = defineProps<{ points: readonly TrendPoint[] }>()

const WIDTH = 320
const HEIGHT = 150
const TOP = 18
const BOTTOM = 22
const GAP = 0.45

const dateLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })

const chart = computed(() => {
  const max = Math.max(1, ...points.map((point) => point.fillers))
  const slot = WIDTH / Math.max(points.length, 6)
  const width = slot * (1 - GAP)
  const offset = (WIDTH - slot * points.length) / 2
  const plot = HEIGHT - TOP - BOTTOM
  const bars = points.map((point, index) => {
    const height = Math.max(3, (point.fillers / max) * plot)
    return {
      ...point,
      x: offset + index * slot + (slot - width) / 2,
      y: TOP + plot - height,
      width,
      height,
      center: offset + index * slot + slot / 2,
      day: new Date(point.recordedAt).getDate(),
      latest: index === points.length - 1,
    }
  })
  return {
    bars,
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
      v-for="fraction in [0, 0.5]"
      :key="fraction"
      x1="0"
      :x2="WIDTH"
      :y1="TOP + fraction * (HEIGHT - TOP - BOTTOM)"
      :y2="TOP + fraction * (HEIGHT - TOP - BOTTOM)"
      class="filler-chart__grid"
    />
    <g v-for="bar in chart.bars" :key="bar.id">
      <rect
        :x="bar.x"
        :y="bar.y"
        :width="bar.width"
        :height="bar.height"
        rx="2"
        class="filler-chart__bar"
        :class="{ 'filler-chart__bar--latest': bar.latest }"
      />
      <text :x="bar.center" :y="bar.y - 6" class="filler-chart__value">
        {{ bar.fillers }}
      </text>
      <text :x="bar.center" :y="HEIGHT - 6" class="filler-chart__day">
        {{ bar.day }}
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
.filler-chart__grid {
  stroke: var(--line);
  stroke-dasharray: 3 4;
}
.filler-chart__bar {
  fill: var(--accent);
}
.filler-chart__bar--latest {
  fill: var(--ink);
}
.filler-chart__value,
.filler-chart__day {
  font-family: var(--font-mono);
  font-size: 9px;
  text-anchor: middle;
}
.filler-chart__value {
  fill: var(--ink);
  font-weight: 600;
}
.filler-chart__day {
  fill: var(--muted);
}
</style>

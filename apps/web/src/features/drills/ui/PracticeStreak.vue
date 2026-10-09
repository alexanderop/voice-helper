<script setup lang="ts">
import { computed } from 'vue'
import { UiCard } from '@talk-coach/ui'
import { WEEKLY_GOAL_DAYS, type PracticeCalendar } from '../domain/calendar'
import {
  WEEKDAYS,
  dayLabel,
  daysOfGoal,
  remainingLine,
  streakHeadline,
} from './streakMessages'

const { calendar } = defineProps<{ calendar: PracticeCalendar }>()
const week = computed(() => calendar.weeks.at(-1))
</script>
<template>
  <UiCard
    v-if="week"
    element="section"
    class="streak-card"
    aria-labelledby="streak-title"
  >
    <div class="streak-card__head">
      <h2 id="streak-title" class="streak-card__title">
        {{ streakHeadline(calendar.current) }}
      </h2>
      <span class="pill">Best: {{ calendar.best }}</span>
    </div>
    <ol class="week-dots">
      <li v-for="(item, index) in week.days" :key="item.day">
        <span class="day-mark" :data-state="item.state"></span>
        <span class="week-dots__name" aria-hidden="true">{{
          WEEKDAYS[index]
        }}</span>
        <span class="sr-only">{{ dayLabel(item.day, item.state) }}</span>
      </li>
    </ol>
    <p class="streak-card__week">This week: {{ daysOfGoal(week.practiced) }}</p>
    <progress
      class="goal-bar"
      :max="WEEKLY_GOAL_DAYS"
      :value="Math.min(week.practiced, WEEKLY_GOAL_DAYS)"
      aria-label="Days practiced this week"
    ></progress>
    <p class="fine-print">{{ remainingLine(week.practiced) }}</p>
  </UiCard>
</template>

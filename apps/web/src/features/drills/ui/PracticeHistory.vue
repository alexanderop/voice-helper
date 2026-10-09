<script setup lang="ts">
import { computed } from 'vue'
import { UiCard } from '@talk-coach/ui'
import { WEEKLY_GOAL_DAYS, type PracticeCalendar } from '../domain/calendar'
import { WEEKDAYS, dayLabel, shortDate } from './streakMessages'

const { calendar } = defineProps<{ calendar: PracticeCalendar }>()
const thisWeek = computed(() => calendar.weeks.at(-1)?.practiced ?? 0)
const stats = computed(() => [
  { label: 'Current streak', value: String(calendar.current) },
  { label: 'Best streak', value: String(calendar.best) },
  { label: 'This week', value: `${thisWeek.value}/${WEEKLY_GOAL_DAYS}` },
])
const LEGEND = [
  { state: 'practiced', label: 'Practiced' },
  { state: 'missed', label: 'Not practiced' },
  { state: 'today', label: 'Today' },
  { state: 'future', label: 'Still to come' },
] as const
</script>
<template>
  <dl class="metrics">
    <div v-for="stat in stats" :key="stat.label" class="metric">
      <dt>{{ stat.label }}</dt>
      <dd>{{ stat.value }}</dd>
    </div>
  </dl>
  <UiCard
    element="section"
    class="history-card"
    aria-labelledby="history-title"
  >
    <h2 id="history-title" class="history-card__title">
      Last {{ calendar.weeks.length }} weeks
    </h2>
    <table class="week-grid">
      <caption class="sr-only">
        Days practiced in each week, oldest week first. The goal is
        {{
          WEEKLY_GOAL_DAYS
        }}
        days.
      </caption>
      <thead>
        <tr>
          <th scope="col"><span class="sr-only">Week of</span></th>
          <th v-for="name in WEEKDAYS" :key="name" scope="col">{{ name }}</th>
          <th scope="col"><span class="sr-only">Days practiced</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="week in calendar.weeks" :key="week.monday">
          <th scope="row">{{ shortDate(week.monday) }}</th>
          <td v-for="item in week.days" :key="item.day">
            <span class="day-mark" :data-state="item.state"></span
            ><span class="sr-only">{{ dayLabel(item.day, item.state) }}</span>
          </td>
          <td
            class="week-grid__count"
            :class="{
              'week-grid__count--met': week.practiced >= WEEKLY_GOAL_DAYS,
            }"
          >
            {{ week.practiced
            }}<span class="sr-only"> of {{ WEEKLY_GOAL_DAYS }} days</span>
          </td>
        </tr>
      </tbody>
    </table>
    <ul class="week-legend">
      <li v-for="item in LEGEND" :key="item.state">
        <span
          class="day-mark"
          :data-state="item.state"
          aria-hidden="true"
        ></span
        >{{ item.label }}
      </li>
    </ul>
  </UiCard>
</template>

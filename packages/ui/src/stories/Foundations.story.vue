<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiCard, UiBadge } from '../index'
const dark = ref(false)
const tokens = [
  'bg',
  'surface',
  'ink',
  'muted',
  'accent',
  'soft',
  'highlight',
  'line',
  'line-strong',
]
</script>
<template>
  <Story title="Foundations / Theme and tokens"
    ><Variant title="Light and dark"
      ><div
        :data-theme="dark ? 'dark' : 'light'"
        class="story-layout"
        style="
          background: var(--bg);
          color: var(--ink);
          min-height: 100vh;
          max-width: none;
        "
      >
        <header>
          <UiBadge tone="success">Plainspoken</UiBadge>
          <h1
            style="
              font-family: var(--font-display);
              font-size: 2.4rem;
              letter-spacing: -0.04em;
              margin-bottom: 10px;
            "
          >
            One thought. Spoken clearly.
          </h1>
          <p style="color: var(--muted); max-width: 460px; line-height: 1.7">
            Warm paper, serif headlines, and restrained green. Language comes
            before measurement.
          </p>
        </header>
        <div class="story-row">
          <div v-for="token in tokens" :key="token" style="width: 100px">
            <div
              :style="{
                background: `var(--${token})`,
                height: '64px',
                border: '1px solid var(--line)',
                borderRadius: '12px',
              }"
            />
            <p style="font-size: 12px">{{ token }}</p>
          </div>
        </div>
        <UiCard style="max-width: 460px; display: grid; gap: 20px"
          ><div class="story-row">
            <UiButton>Primary action</UiButton
            ><UiButton variant="secondary">Secondary</UiButton>
          </div></UiCard
        >
      </div>
      <template #controls
        ><HstCheckbox v-model="dark" title="Dark theme" /></template></Variant
  ></Story>
</template>

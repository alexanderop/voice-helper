<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiCard, UiBadge, UiWaveform } from '../index'
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
          <UiBadge tone="success">Signal</UiBadge>
          <h1
            style="
              font-size: 2.4rem;
              font-weight: 750;
              letter-spacing: -0.045em;
              margin-bottom: 10px;
            "
          >
            Find your clear signal.
          </h1>
          <p style="color: var(--muted); max-width: 460px; line-height: 1.7">
            An understated audio instrument. Crisp readouts and a quiet waveform
            put the practice in focus.
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
        <UiWaveform :bars="40" :progress="0.4" />
        <UiWaveform variant="dots" :bars="44" />
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

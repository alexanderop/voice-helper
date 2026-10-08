<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiCard, UiBadge, UiInput } from '../index'
const dark = ref(false)
const tokens = [
  'background',
  'surface',
  'foreground',
  'muted',
  'primary',
  'border',
]
</script>
<template>
  <Story title="Foundations / Theme and tokens"
    ><Variant title="Light and dark"
      ><div
        :data-theme="dark ? 'dark' : 'light'"
        class="story-layout"
        style="
          background: var(--color-background);
          color: var(--color-foreground);
          min-height: 100vh;
          max-width: none;
        "
      >
        <header>
          <UiBadge tone="success">Starter UI</UiBadge>
          <h1
            style="
              font-size: 36px;
              letter-spacing: -1.5px;
              font-weight: 600;
              margin-bottom: 10px;
            "
          >
            A quieter place to build.
          </h1>
          <p
            style="
              color: var(--color-muted);
              max-width: 460px;
              line-height: 1.7;
            "
          >
            Geist typography, restrained teal, and generous spacing. A small
            foundation for interfaces that feel at home.
          </p>
        </header>
        <div class="story-row">
          <div v-for="token in tokens" :key="token" style="width: 100px">
            <div
              :style="{
                background: `var(--color-${token})`,
                height: '64px',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
              }"
            />
            <p style="font-size: 12px">{{ token }}</p>
          </div>
        </div>
        <UiCard style="max-width: 460px; display: grid; gap: 20px"
          ><UiInput label="A clear label" placeholder="A useful hint" />
          <div class="story-row">
            <UiButton>Primary action</UiButton
            ><UiButton variant="secondary">Secondary</UiButton>
          </div></UiCard
        >
      </div>
      <template #controls
        ><HstCheckbox v-model="dark" title="Dark theme" /></template></Variant
  ></Story>
</template>

<script setup lang="ts">
import { UiBadge, UiCard } from '../index'
</script>
<template>
  <Story title="Components / Feedback"
    ><Variant title="Card and badges"
      ><div class="story-layout">
        <UiCard
          ><div class="story-row">
            <UiBadge>On device</UiBadge
            ><UiBadge tone="success">Offline · ready</UiBadge
            ><UiBadge tone="warning">Update ready</UiBadge>
          </div>
          <h2>One thought. Spoken clearly.</h2>
          <p>A card groups related content.</p></UiCard
        >
      </div></Variant
    ></Story
  >
</template>

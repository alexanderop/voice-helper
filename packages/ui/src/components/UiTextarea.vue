<script setup lang="ts">
import { computed, useId } from 'vue'
defineOptions({ inheritAttrs: false })
const { label, id, error } = defineProps<{
  label: string
  id?: string
  error?: string | undefined
}>()
const model = defineModel<string>({ default: '' })
const generatedId = useId()
const inputId = computed(() => id ?? generatedId)
</script>
<template>
  <div class="ui-field">
    <label :for="inputId" class="ui-field__label">{{ label }}</label
    ><textarea
      v-bind="$attrs"
      :id="inputId"
      v-model="model"
      class="ui-field__control"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="
        error
          ? `${inputId}-error`
          : ($attrs['aria-describedby'] as string | undefined)
      "
    />
    <p v-if="error" :id="`${inputId}-error`" class="ui-field__error">
      {{ error }}
    </p>
  </div>
</template>

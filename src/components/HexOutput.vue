<script setup lang="ts">
import { computed } from 'vue'

import { value, valueClass } from './hex_output_helpers'
import { bytesToUTF8 } from '../output'

const props = defineProps<{
  items: Uint8Array | number[]
  printASCII: boolean
  printControlCharacters: boolean
  printCodePoints: boolean
}>()

const values = computed(() => {
  if (props.printCodePoints) {
    const utf8 = bytesToUTF8(props.items)
    return [...utf8].map((c) => c.codePointAt(0) ?? -1)
  }
  return props.items
})
</script>

<template>
  <div class="hex-output" :class="{ 'hex-8-column': printCodePoints }">
    <span
      v-for="(item, index) in values"
      :key="index"
      :class="valueClass(item, printASCII && !printControlCharacters)"
    >
      {{ value(item, printASCII, printControlCharacters) }}
    </span>
  </div>
</template>

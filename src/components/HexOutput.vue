<script setup lang="ts">
import { computed } from 'vue'

import { bytesToUTF8 } from './../b2x'

const props = defineProps<{
  items: Uint8Array | number[]
  printASCII: boolean
  printControlCharacters: boolean
  printCodePoints: boolean
}>()

function value(b: number, ascii: boolean, ctrl: boolean): string {
  if (ctrl) {
    if (b >= 0x00 && b <= 0x20) {
      return String.fromCharCode(0x2400 + b)
    }
    if (b == 0x7f) {
      return '\u2421'
    }
  }
  if (ascii) {
    if (b == 0x09) {
      return '\\t'
    } else if (b == 0x0a) {
      return '\\n'
    } else if (b == 0x0b) {
      return '\\v'
    } else if (b == 0x0d) {
      return '\\r'
    } else if (b == 0x20) {
      return '\u00a0' // non-breaking space, to allow underline style to work
    } else if (b >= 0x21 && b <= 0x7e) {
      return String.fromCharCode(b)
    }
  }
  return b.toString(16).padStart(2, '0')
}

function valueClass(b: number, ascii: boolean): string {
  if (b >= 0x21 && b <= 0x7e) {
    // printable (but not space)
    return 'p'
  } else if (b == 0x20) {
    return ascii ? 'sp2' : 'sp'
  } else if (b == 0x09 || b == 0x0b) {
    return 'tb'
  } else if (b == 0x0a || b == 0x0d) {
    // LF, CR
    return 'nl'
  }
  return 'bn'
}

const values = computed(() => {
  if (props.printCodePoints) {
    const utf8 = bytesToUTF8(props.items)
    return [...utf8].map((c) => c.codePointAt(0) || -1)
  }
  return props.items
})
</script>

<template>
  <div class="hex-output" :class="{ 'hex-8-column': printCodePoints }">
    <span v-for="(item, index) in values" :key="index" :class="valueClass(item, printASCII)">
      {{ value(item, printASCII, printControlCharacters) }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  items: Uint8Array | number[]
  printASCII: boolean
}>()

function value(b: number, ascii: boolean): string {
  if (ascii) {
    if (b == 0x20) {
      return '\u00a0'
    } else if (b == 0x01) {
      return '␁'
    } else if (b == 0x09) {
      return '\\t'
    } else if (b == 0x0a) {
      return '\\n'
    } else if (b == 0x0b) {
      return '\\v'
    } else if (b == 0x0c) {
      return '␌'
    } else if (b == 0x0d) {
      return '\\r'
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
</script>

<template>
  <div class="hex-output">
    <span v-for="(item, index) in items" :key="index" :class="valueClass(item, printASCII)">
      {{ value(item, printASCII) }}
    </span>
  </div>
</template>

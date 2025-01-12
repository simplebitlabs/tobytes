<script setup lang="ts">
import { ref, computed } from 'vue'

import HexOutput from './components/HexOutput.vue'

import {
  hexToBytes,
  base64ToBytes,
  bytesToUTF8,
  InputType,
  autodetectInputType,
  DataType,
  autodetectDataType,
} from './b2x'

const input = ref('SGVsbG8hIPCfkYsK')

const inputTypeManual = ref(InputType[InputType.Unknown])

const inputType = computed(() => {
  if (inputTypeManual.value != InputType[InputType.Unknown]) {
    return inputTypeManual.value
  }
  return InputType[autodetectInputType(input.value)]
})

const inputCharacters = computed(() => {
  return [...input.value].length
})

const inputBytes = computed(() => {
  return new TextEncoder().encode(input.value).length
})

const data = computed(() => {
  const val = input.value
  if (inputType.value == InputType[InputType.Hexadecimal]) {
    return hexToBytes(val) || []
  } else if (inputType.value == InputType[InputType.Base64]) {
    return base64ToBytes(input.value)
  } else if (inputType.value == InputType[InputType.Base64URL]) {
    return base64ToBytes(input.value, true)
  } else if (inputType.value == InputType[InputType.UTF8DE]) {
    const newVal = new TextDecoder().decode(Uint8Array.from(val, (c) => c.charCodeAt(0)))
    return new TextEncoder().encode(newVal)
  }
  return new TextEncoder().encode(val)
})

const dataType = computed(() => {
  return DataType[autodetectDataType(data.value)]
})

const displayASCII = ref(false)
const displayControlCharacters = ref(false)
const displayCodePoints = ref(false)
const clipboardCopyType = ref('lowerhex')

const output = computed(() => {
  return bytesToUTF8(data.value)
})

const hasBom = computed(() => {
  return data.value.length >= 3 && data.value[0] == 0xef && data.value[1] == 0xbb && data.value[2] == 0xbf
})

const outputCharacters = computed(() => {
  return [...output.value].length
})

const outputCodePoints = computed(() => {
  return output.value.length
})

const nonBMP = computed(() => {
  return outputCharacters.value != outputCodePoints.value
})

const outputBytes = computed(() => {
  return data.value.length
})
</script>

<template>
  <header>
    <h1>Binary to Sanity</h1>
  </header>

  <main>
    <div class="left">
      <h2>Input</h2>
      <textarea class="input" v-model="input"></textarea>
      <h3>Input Metadata</h3>
      <div class="meta">Detected Data Type: {{ inputType }}</div>
      <div class="meta">
        Choose a different type:
        <select v-model="inputTypeManual">
          <option value="Unknown">Autodetect</option>
          <option>Base 36</option>
          <option value="Base64">Base 64</option>
          <option value="Base64URL">Base 64 URL</option>
          <option>C Escaped</option>
          <option value="Hexadecimal">Hexadecimal (Base 16)</option>
          <option>JWT</option>
          <option>URL Encoded</option>
          <option value="ASCII">ASCII Text</option>
          <option value="UTF8">UTF-8 Text</option>
          <option value="UTF8DE">UTF-8 Text, Double Encoded</option>
          <option>ISO-8859-1 Text</option>
          <option>Windows-1252 (CP-1252) Text</option>
        </select>
      </div>
      <div class="meta">{{ inputCharacters }} characters</div>
      <div class="meta">{{ inputBytes }} bytes encoded as UTF-8</div>
    </div>
    <div class="middle">
      <h2>Raw Bytes</h2>
      <div class="output">
        <HexOutput
          :items="data"
          :printASCII="displayASCII"
          :printControlCharacters="displayControlCharacters"
          :printCodePoints="displayCodePoints"
        />
      </div>
      <h3>Display Options</h3>
      <input type="checkbox" id="hex-ascii" name="hex-ascii" v-model="displayASCII" />
      <label for="hex-ascii"> Display ASCII printable characters</label><br />
      <input type="checkbox" id="hex-cc" name="hex-cc" v-model="displayControlCharacters" />
      <label for="hex-cc">
        Use Unicode <a href="https://en.wikipedia.org/wiki/Control_Pictures">Control Character Pictures</a></label
      ><br />
      <input type="checkbox" id="hex-cp" name="hex-cp" v-model="displayCodePoints" />
      <label for="hex-cp"> Use Unicode Code Points, Not Bytes</label><br />
      <h3>Copy to Clipboard</h3>
      <button>Copy</button> Format:
      <select v-model="clipboardCopyType">
        <option value="lowerhex">Hex (aabb11cc)</option>
        <option value="upperhex">Hex (AABB11CC)</option>
        <option value="lowerhexspace">Hex (aa bb 11 cc)</option>
        <option value="upperhexspace">Hex (AA BB 11 CC)</option>
        <option value="postgresbytea">Postgres Bytea (\xaabb11cc)</option>
      </select>
    </div>
    <div class="right">
      <h2>Output Text</h2>
      <div class="output"><div class="text-output" v-html="output"></div></div>
      <h3>Output Metadata</h3>
      <div class="meta">Detected Data Type: {{ dataType }}</div>
      <div class="meta">{{ outputCharacters }} characters</div>
      <div class="meta">{{ outputBytes }} bytes encoded as UTF-8</div>
      <div class="meta">{{ outputCodePoints }} UTF-16 code points</div>
      <div class="meta">
        Starts with the <a href="https://en.wikipedia.org/wiki/Byte_order_mark">Byte Order Mark</a>:
        {{ hasBom ? '✅' : '❌' }}
      </div>
      <div class="meta">
        Uses characters outside the
        <a href="https://en.wikipedia.org/wiki/Plane_(Unicode)#Basic_Multilingual_Plane">BMP</a>:
        {{ nonBMP ? '✅' : '❌' }}
      </div>
    </div>
  </main>

  <footer></footer>
</template>

<style scoped></style>

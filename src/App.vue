<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

import HexOutput from './components/HexOutput.vue'

import {
  escapeSequenceToBytes,
  hexToBytes,
  base64ToBytes,
  qpToBytes,
  bytesToUTF8,
  InputType,
  friendlyInputType,
  autodetectInputType,
  friendlyDataType,
  autodetectDataType,
  exportData,
} from './b2x'
import { isValidUTF8, doubleEncodedUTF8 } from './utf8'

const input = ref('SGVsbG8hIPCfkYsK')

const inputTypeManual = ref(InputType[InputType.Unknown])

const inputType = computed(() => {
  if (inputTypeManual.value != InputType[InputType.Unknown]) {
    return InputType[inputTypeManual.value as keyof typeof InputType]
  }
  return autodetectInputType(input.value)
})

const inputCharacters = computed(() => {
  return [...input.value].length
})

const inputBytes = computed(() => {
  return new TextEncoder().encode(input.value).length
})

const dataBeforeDoubleEncoding = computed(() => {
  const val = input.value
  let output: Uint8Array
  try {
    if (inputType.value == InputType.CEscape) {
      output = escapeSequenceToBytes(val)
    } else if (inputType.value == InputType.Hexadecimal) {
      output = hexToBytes(val)
    } else if (inputType.value == InputType.Base64) {
      output = base64ToBytes(input.value)
    } else if (inputType.value == InputType.Base64URL) {
      output = base64ToBytes(input.value, true)
    } else if (inputType.value == InputType.QuotedPrintable) {
      output = qpToBytes(val)
    } else {
      output = new TextEncoder().encode(val)
    }
  } catch {
    console.warn('error decoding input, falling back to text')
    output = new TextEncoder().encode(val)
  }
  return output
})

const data = computed(() => {
  let output = dataBeforeDoubleEncoding.value
  if (interpretAsDoubleEncoded.value) {
    const secondDecode = new TextDecoder().decode(output)
    output = Uint8Array.from(secondDecode, (c) => c.charCodeAt(0))
  }
  return output
})

const inputIsValidUTF8 = computed(() => {
  return isValidUTF8(dataBeforeDoubleEncoding.value)
})

const inputDoubleEncoded = computed(() => {
  return doubleEncodedUTF8(dataBeforeDoubleEncoding.value)
})

const interpretAsDoubleEncoded = ref(false)

const displayASCII = ref(false)
const displayControlCharacters = ref(false)
const displayCodePoints = ref(false)
const clipboardCopyType = ref('utf8')

const dataType = computed(() => {
  return autodetectDataType(data.value)
})

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

const recentCopy = ref(false)
let copyTimeout: ReturnType<typeof setTimeout> | undefined

async function copyToClipboard(event: Event) {
  if (copyTimeout) {
    clearTimeout(copyTimeout)
  }
  const text = exportData(clipboardCopyType.value, data.value)
  try {
    await navigator.clipboard.writeText(text)
    recentCopy.value = true
    copyTimeout = setTimeout(() => {
      recentCopy.value = false
    }, 1000)
  } catch (e) {
    console.error('Cannot copy to clipboard:', e)
  }
}

onBeforeUnmount(() => {
  if (copyTimeout) {
    clearTimeout(copyTimeout)
  }
})
</script>

<template>
  <header>
    <h1>🔎 Binary Sanity</h1>
  </header>

  <main>
    <div class="left">
      <h2>Input</h2>
      <textarea class="input" v-model="input"></textarea>
      <h3>Input Metadata</h3>
      <div class="meta">Detected input type: {{ friendlyInputType(inputType) }}</div>
      <div class="meta">
        <label for="input-type-manual">Choose a different type:</label>
        <select id="input-type-manual" v-model="inputTypeManual">
          <option value="Unknown">Autodetect</option>
          <option value="ASCII">ASCII Text</option>
          <option value="UTF8">UTF-8 Text</option>
          <!--<option>Base 36</option>-->
          <option value="Base64">Base 64</option>
          <option value="Base64URL">Base 64 URL</option>
          <option value="CEscape">C-like Escape Sequence</option>
          <option value="Hexadecimal">Hexadecimal (Base 16)</option>
          <option value="QuotedPrintable">Quoted Printable</option>
          <!--<option>JWT</option>-->
          <!--<option>URL Encoded</option>-->
          <!--<option>ISO-8859-1 Text</option>-->
          <!--<option>Windows-1252 (CP-1252) Text</option>-->
        </select>
      </div>
      <div class="meta">{{ inputCharacters }} characters</div>
      <div class="meta">{{ inputBytes }} bytes encoded as UTF-8</div>
      <div class="meta">{{ inputIsValidUTF8 ? '✅' : '❌' }} Looks like valid UTF-8</div>
      <div class="meta">
        {{ inputDoubleEncoded ? '✅' : '❌' }} Looks like
        <a href="https://stackoverflow.com/questions/11546351/what-character-encoding-is-c3-82-c2-bf"
          >Double Encoded UTF-8</a
        >
      </div>
      <input type="checkbox" id="utf8-de" name="utf8-de" role="switch" v-model="interpretAsDoubleEncoded" />
      <label for="utf8-de"> Interpret as Double Encoded UTF-8</label><br />
    </div>
    <div class="middle">
      <h2>Raw</h2>
      <div class="output">
        <HexOutput
          :items="data"
          :printASCII="displayASCII"
          :printControlCharacters="displayControlCharacters"
          :printCodePoints="displayCodePoints"
        />
      </div>
      <h3>Display Options</h3>
      <input type="checkbox" id="hex-ascii" name="hex-ascii" role="switch" v-model="displayASCII" />
      <label for="hex-ascii"> Show ASCII printable characters</label><br />
      <input type="checkbox" id="hex-cc" name="hex-cc" role="switch" v-model="displayControlCharacters" />
      <label for="hex-cc">
        Show Unicode <a href="https://en.wikipedia.org/wiki/Control_Pictures">Control Character Pictures</a></label
      ><br />
      <input type="checkbox" id="hex-cp" name="hex-cp" role="switch" v-model="displayCodePoints" />
      <label for="hex-cp"> Show Unicode Code Points, Not Bytes</label><br />
      <h3>Copy to Clipboard</h3>
      <fieldset role="group">
        <select v-model="clipboardCopyType">
          <option value="utf8">UTF-8 Text</option>
          <option value="base64">Base 64</option>
          <option value="base64url">Base 64 URL</option>
          <option value="lowerhex">Hex (aabb11cc)</option>
          <option value="upperhex">Hex (AABB11CC)</option>
          <option value="lowerhexspace">Hex (aa bb 11 cc)</option>
          <option value="upperhexspace">Hex (AA BB 11 CC)</option>
          <option value="postgresbytea">Postgres Bytea (\xaabb11cc)</option>
          <option value="hexarray">Hex Array ([0xaa, 0xbb, 0x11, 0xcc])</option>
        </select>
        <button @click="copyToClipboard">Copy</button>
      </fieldset>
      <Transition name="fade">
        <div class="copy-hint" v-if="recentCopy">Copied!</div>
      </Transition>
    </div>
    <div class="right">
      <h2>Output</h2>
      <div class="output"><div class="text-output" v-html="output"></div></div>
      <h3>Output Metadata</h3>
      <div class="meta">Detected output type: {{ friendlyDataType(dataType) }}</div>
      <div class="meta">{{ outputCharacters }} characters</div>
      <div class="meta">{{ outputBytes }} bytes encoded as UTF-8</div>
      <div class="meta">{{ outputCodePoints }} UTF-16 code points</div>
      <div class="meta">
        {{ hasBom ? '✅' : '❌' }} Starts with the
        <a href="https://en.wikipedia.org/wiki/Byte_order_mark">Byte Order Mark</a>
      </div>
      <div class="meta">
        {{ nonBMP ? '✅' : '❌' }} Uses characters outside the
        <a href="https://en.wikipedia.org/wiki/Plane_(Unicode)#Basic_Multilingual_Plane">BMP</a>
      </div>
    </div>
  </main>

  <footer></footer>
</template>

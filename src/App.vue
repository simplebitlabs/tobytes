<script setup lang="ts">
import { ref, computed } from 'vue'
import { hexToBytes, bytesToUTF8, InputType, autodetectType } from './b2x'

const input = ref(
  '\\x0a0c08b498f6bb0610eca0f6bb062a0b120234302a0530343331302a0b120234302a0530393434302a0b120234302a0530353038352a0b120234302a0530333634302a0b1202343' +
    '02a0530313336362a0b120234302a0530353534312a0b120234302a0531313230372a0b120234302a0530353534302a0b120234302a0530353534382a0b120234302a05303535373' +
    '42a0b120234302a0530353534322a0b120234302a0531343638312a0b120234302a0530353536302a0b120234302a0530353534362a0b120234302a0531343734302a0b120234302' +
    'a0531303836352a0b120234302a0530373732332a0b120234302a0530373732372a0b120234302a0530373732392a0b120234302a0531323532332a0b120234302a0530373634312' +
    'a0b120234302a0530373733312a0b120234302a0530373732302a0b120234302a0530303236312a0b120234302a0530363133352a0b120234302a0530363132373003380242200a1' +
    'e0a1868747470733a2f2f7777772e726964657274612e636f6d2f1202656e52330a310a2b526564756365642053657276696365206f6e20233430204c616b6576696577e280934c6' +
    '56520536f7574681202656e5ade010adb010ad4014743525441205345525649434520414c4552540d0a0d0a574841543a0d0a526564756365642053657276696365206f6e2023343' +
    '0204c616b6576696577e280934c656520536f7574680d0a0d0a5748593a0d0a4d656368616e6963616c2050726f626c656d0d0a0d0a5748454e3a0d0a312f372f3230323520333a3' +
    '1393a303020504d20756e74696c20312f372f3230323520333a33373a303020504d0d0a0d0a57484552453a0d0a454444592052442026205441465420415620746f204d415946494' +
    '54c442052442026204c454520424c56441202656e62330a310a2b526564756365642053657276696365206f6e20233430204c616b6576696577e280934c656520536f75746812026' +
    '56e6a9c010a99010a9201526564756365642053657276696365206f6e20233430204c616b6576696577e280934c656520536f7574682062656361757365206f66204d656368616e6' +
    '963616c2050726f626c656d20617420454444592052442026205441465420415620746f204d41594649454c442052442026204c454520424c564420756e74696c20312f372f32303' +
    '23520333a33373a303020504d1202656e8a011a0a180a124d656368616e6963616c2050726f626c656d1202656e9201170a150a0f5265647563656420536572766963651202656ec' +
    '2b2041d0a0534323531341201301a1132303235303130372031353a31313a3334',
)

const inputTypeManual = ref(InputType[InputType.Unknown])

const inputType = computed(() => {
  if (inputTypeManual.value != InputType[InputType.Unknown]) {
    return inputTypeManual.value
  }
  return InputType[autodetectType(input.value)]
})

const hasBom = computed(() => {
  const val = input.value
  return val.startsWith('\ufeff')
})

const nonBMP = computed(() => {
  return input.value.length != [...input.value].length
})

const output = computed(() => {
  let val = input.value
  if (inputType.value == InputType[InputType.Hexadecimal]) {
    const asBytes = hexToBytes(val)
    console.log(asBytes)
    if (asBytes) {
      val = bytesToUTF8(asBytes)
    }
  } else if (inputType.value == InputType[InputType.Base64]) {
    if (typeof window !== 'undefined') {
      console.log('attempting base64 decode: ' + input.value)
      val = window.atob(input.value)
      console.log(val)
    } else {
      const asBytes = Buffer.from(input.value, 'base64')
      console.log(asBytes)
      if (asBytes) {
        val = bytesToUTF8(asBytes)
      }
    }
  }
  return val
})

const outputLength = computed(() => {
  // TODO: characters vs codepoints vs bytes
  return output.value.length
})
</script>

<template>
  <header></header>

  <main>
    <div class="left">
      <textarea class="input" v-model="input"></textarea>
      <h3>Input Metadata</h3>
      <div>
        Auto-detected: {{ inputType }}<br />
        Choose a different type:
        <select v-model="inputTypeManual">
          <option value="Unknown"></option>
          <option>Base 36</option>
          <option value="Base64">Base 64</option>
          <option value="Base64URL">Base 64 URL</option>
          <option>C Escaped</option>
          <option value="Hexadecimal">Hexadecimal (Base 16)</option>
          <option>JWT</option>
          <option>URL Encoded</option>
          <option value="ASCII">ASCII Text</option>
          <option value="UTF8">UTF-8 Text</option>
          <option>ISO-8859-1 Text</option>
          <option>Windows-1252 (CP-1252) Text</option>
        </select>
      </div>
      <div>
        Contains <a href="https://en.wikipedia.org/wiki/Byte_order_mark">Byte Order Mark</a>:
        {{ hasBom ? '✅' : '❌' }}
      </div>
      <div>
        Uses characters outside the
        <a href="https://en.wikipedia.org/wiki/Plane_(Unicode)#Basic_Multilingual_Plane">BMP</a>:
        {{ nonBMP ? '✅' : '❌' }}
      </div>
    </div>
    <div class="right">
      <div class="output" v-html="output"></div>
      <div class="output-meta">{{ outputLength }} characters</div>
    </div>
  </main>

  <footer></footer>
</template>

<style scoped></style>

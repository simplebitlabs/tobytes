import { expect, test } from 'vitest'

import { hexToBytes, bytesToUTF8, InputType, autodetectType } from './b2x'

test('bytesToUTF8 with BOM', () => {
  const input = [0xef, 0xbb, 0xbf, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a] // BOM followed by "hello\n"
  const expectedOutput = 'hello\n'
  expect(bytesToUTF8(input)).toBe(expectedOutput)
})

test('autodetectType', () => {
  expect(autodetectType('0xabc123')).toBe(InputType.Hexadecimal)
  expect(autodetectType('\\xabc123')).toBe(InputType.Hexadecimal)
  expect(autodetectType('abc123')).toBe(InputType.Hexadecimal)
  expect(autodetectType('bGlnaHQgd29y')).toBe(InputType.Base64)
  expect(autodetectType('bGlnaHQgdw==')).toBe(InputType.Base64)
  expect(autodetectType('fn5+fn5+')).toBe(InputType.Base64) // ~~~~~~
  expect(autodetectType('fn5-fn5-')).toBe(InputType.Base64URL) // ~~~~~~
  expect(autodetectType('The quick brown fox jumps over the lazy dog')).toBe(InputType.ASCII)
  expect(autodetectType('.')).toBe(InputType.ASCII)
  expect(autodetectType('~')).toBe(InputType.ASCII)
  expect(autodetectType('✅')).toBe(InputType.UTF8)
  expect(autodetectType('👋 👋')).toBe(InputType.UTF8) // this emoji is outside the Unicode BMP

  const input = '👋 👋'
  console.log('input length codep: ' + input.length)
  console.log('input length chars: ' + [...input].length)
  // see also: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length
  // notes about Intl.Segmenter
  console.log(input.codePointAt(0)) // charCodeAt doesn't handle UTF-16 surrogate pairs
  console.log([...input].map((c) => c.codePointAt(0)))
})

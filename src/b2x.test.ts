import { expect, test } from 'vitest'

import { hexToBytes, bytesToUTF8, InputType, autodetectInputType, DataType, autodetectDataType } from './b2x'

test('hexToBytes', () => {
  expect(hexToBytes('68656c6c6f0a')).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
  expect(hexToBytes('\\x68656c6c6f0a')).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
  expect(hexToBytes('0x68656c6c6f0a')).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
  expect(hexToBytes('68 65 6c 6c 6f 0a')).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
  expect(hexToBytes('not hex')).toBeUndefined()
})

test('bytesToUTF8 with BOM', () => {
  const input = [0xef, 0xbb, 0xbf, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a] // BOM followed by "hello\n"
  const expectedOutput = 'hello\n'
  expect(bytesToUTF8(input)).toBe(expectedOutput)
})

test('autodetectInputType', () => {
  expect(autodetectInputType('0xabc123')).toBe(InputType.Hexadecimal)
  expect(autodetectInputType('\\xabc123')).toBe(InputType.Hexadecimal)
  expect(autodetectInputType('abc123')).toBe(InputType.Hexadecimal)
  expect(autodetectInputType('ab c1 23')).toBe(InputType.Hexadecimal)
  expect(autodetectInputType('bGlnaHQgd29y')).toBe(InputType.Base64)
  expect(autodetectInputType('bGlnaHQgdw==')).toBe(InputType.Base64)
  expect(autodetectInputType('fn5+fn5+')).toBe(InputType.Base64) // ~~~~~~
  expect(autodetectInputType('fn5-fn5-')).toBe(InputType.Base64URL) // ~~~~~~
  expect(autodetectInputType('abc123.')).toBe(InputType.ASCII)
  expect(autodetectInputType('The quick brown fox jumps over the lazy dog')).toBe(InputType.ASCII)
  expect(autodetectInputType('.')).toBe(InputType.ASCII)
  expect(autodetectInputType('~')).toBe(InputType.ASCII)
  expect(autodetectInputType('✅')).toBe(InputType.UTF8)
  expect(autodetectInputType('👋 👋')).toBe(InputType.UTF8) // this emoji is outside the Unicode BMP

  const input = '👋 👋'
  console.log('input length codep: ' + input.length)
  console.log('input length chars: ' + [...input].length)
  // see also: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length
  // notes about Intl.Segmenter
  console.log(input.codePointAt(0)) // charCodeAt doesn't handle UTF-16 surrogate pairs
  console.log([...input].map((c) => c.codePointAt(0)))
})

test('autodetectDataType', () => {
  const e = (input: string) => new TextEncoder().encode(input)
  expect(autodetectDataType(e('hello world'))).toBe(DataType.ASCII)
  expect(autodetectDataType(e('hello\tworld\r\n'))).toBe(DataType.ASCII)
  expect(autodetectDataType(e('bell: \x07'))).toBe(DataType.Binary)
  expect(autodetectDataType(e('check: ✅'))).toBe(DataType.UTF8)
  expect(autodetectDataType(e('wave: 👋'))).toBe(DataType.UTF8)
  expect(autodetectDataType(e('adiós'))).toBe(DataType.UTF8)
})

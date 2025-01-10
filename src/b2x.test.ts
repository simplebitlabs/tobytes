import { expect, test } from 'vitest'

import { hexToBytes, bytesToUTF8, InputType, autodetectInputType, DataType, autodetectDataType } from './b2x'

test('hexToBytes', () => {
  expect(hexToBytes('68656c6c6f0a')).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
  expect(hexToBytes('\\x68656c6c6f0a')).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
  expect(hexToBytes('0x68656c6c6f0a')).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
  expect(hexToBytes('68 65 6c 6c 6f 0a')).toEqual([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a])
  expect(hexToBytes('not hex')).toBeUndefined()
})

test('bytesToUTF8', () => {
  const input = [0xf0, 0x9f, 0x91, 0x8b] // UTF-8 encoded 👋
  const expectedOutput = '👋'
  expect(bytesToUTF8(input)).toBe(expectedOutput)
})

test('bytesToUTF8 with BOM', () => {
  const input = [0xef, 0xbb, 0xbf, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a] // BOM followed by "hello\n"
  const expectedOutput = '\ufeffhello\n'
  expect(bytesToUTF8(input)).toBe(expectedOutput)
})

test('autodetectInputType', () => {
  expect(autodetectInputType('0xabc123')).toBe(InputType.Hexadecimal)
  expect(autodetectInputType('\\xabc123')).toBe(InputType.Hexadecimal)
  expect(autodetectInputType('abc123')).toBe(InputType.Hexadecimal)
  expect(autodetectInputType('ab c1 23')).toBe(InputType.Hexadecimal)
  expect(autodetectInputType('bGlnaHQgd29y')).toBe(InputType.Base64)
  expect(autodetectInputType('bGlnaHQgdw==')).toBe(InputType.Base64)
  // line wraps shouldn't matter
  expect(autodetectInputType('bGlna\nHQgdw==')).toBe(InputType.Base64)
  expect(autodetectInputType('bGlna\nHQgdw==\n')).toBe(InputType.Base64)
  expect(autodetectInputType('fn5+fn5+')).toBe(InputType.Base64) // ~~~~~~
  expect(autodetectInputType('fn5-fn5-')).toBe(InputType.Base64URL) // ~~~~~~
  expect(autodetectInputType('abc123.')).toBe(InputType.ASCII)
  // TODO: get smart enough that we can say "yeah, this is text, not base64"
  // expect(autodetectInputType('The quick brown fox jumps over the lazy dog')).toBe(InputType.ASCII)
  expect(autodetectInputType('The quick brown fox jumps over the lazy dog.')).toBe(InputType.ASCII)
  expect(autodetectInputType('.')).toBe(InputType.ASCII)
  expect(autodetectInputType('~')).toBe(InputType.ASCII)
  expect(autodetectInputType('✅')).toBe(InputType.UTF8)
  expect(autodetectInputType('👋 👋')).toBe(InputType.UTF8) // this emoji is outside the Unicode BMP
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

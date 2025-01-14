import { expect, test } from 'vitest'

import {
  hexToBytes,
  base64ToBytes,
  bytesToBase64,
  bytesToUTF8,
  InputType,
  autodetectInputType,
  autodetectValidUTF8,
  autodetectDoubleEncoded,
  DataType,
  autodetectDataType,
} from './b2x'

test('hexToBytes', () => {
  expect(hexToBytes('68656c6c6f0a')).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]))
  expect(hexToBytes('\\x68656c6c6f0a')).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]))
  expect(hexToBytes('0x68656c6c6f0a')).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]))
  expect(hexToBytes('68 65 6c 6c 6f 0a')).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]))
  expect(hexToBytes('not hex')).toBeUndefined()
  expect(hexToBytes('12 34 5')).toBeUndefined() // not an even number of hex digits
})

test('base64ToBytes', () => {
  expect(base64ToBytes('SGVsbG8hIPCfkYsK')).toEqual(
    new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0x20, 0xf0, 0x9f, 0x91, 0x8b, 0x0a]),
  )
})

test('bytesToBase64', () => {
  expect(bytesToBase64([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0x20, 0xf0, 0x9f, 0x91, 0x8b, 0x0a])).toBe(
    'SGVsbG8hIPCfkYsK',
  )
  // test regular and URL variant - test string is "~~~~~~" which triggers differences
  expect(bytesToBase64(new Uint8Array(6).fill(0x7e), false)).toBe('fn5+fn5+')
  expect(bytesToBase64(new Uint8Array(6).fill(0x7e), true)).toBe('fn5-fn5-')
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

test('autodetectValidUTF8', () => {
  const original = 'Benjamín pidió una bebida de kiwi y fresa. Noé, sin vergüenza, la más exquisita champaña del menú.'
  // encoded to CP1252 via this command:
  // echo $str | iconv -f UTF-8 -t CP1252 | base64
  const cp1252base64 =
    'QmVuamFt7W4gcGlkafMgdW5hIGJlYmlkYSBkZSBraXdpIHkgZnJlc2EuIE5v6Swgc2luIHZlcmf8ZW56YSwgbGEgbeFzIGV4cXVpc2l0YSBjaGFtcGHxYSBkZWwgbWVu+i4K'

  const originalAsBytes = new TextEncoder().encode(original)
  expect(autodetectValidUTF8(originalAsBytes)).toBe(true)

  const cp1252AsBytes = base64ToBytes(cp1252base64)
  expect(autodetectValidUTF8(cp1252AsBytes)).toBe(false)

  const lotsOfCharacters =
    'Hello! 👋 ⭐ 💀 ⛷️ pidió κόσμε déçu þjófum イロハニホヘト Съешь ฌานสมาธิ გვიპყრობდა օճառաջուր trång Zażółć'
  const lotsofBytes = new TextEncoder().encode(lotsOfCharacters)
  expect(autodetectValidUTF8(lotsofBytes)).toBe(true)

  // single byte invalid sequences
  expect(autodetectValidUTF8(new Uint8Array([0xc0]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xc1]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xf7]))).toBe(false)

  // continuation byte with nothing before it
  expect(autodetectValidUTF8(new Uint8Array([0x80]))).toBe(false)

  // first byte with nothing after it
  expect(autodetectValidUTF8(new Uint8Array([0xe0]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xe1]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xed]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xee]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xf0]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xf1]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xf4]))).toBe(false)

  // various "overlong encodings" should be seen as invalid
  expect(autodetectValidUTF8(new Uint8Array([0xc0, 0xaf]))).toBe(false)
  expect(autodetectValidUTF8(new Uint8Array([0xe0, 0x9f, 0x80]))).toBe(false)

  // our friend the BOM is a valid string
  expect(autodetectValidUTF8(new Uint8Array([0xef, 0xbb, 0xbf]))).toBe(true)

  // unicode non-characters U+FFFE and U+FFFF should be seen as OK, as UTF requires it
  expect(autodetectValidUTF8(new Uint8Array([0xef, 0xbf, 0xbe]))).toBe(true)
  expect(autodetectValidUTF8(new Uint8Array([0xef, 0xbf, 0xbf]))).toBe(true)
  // same thing for U+10FFFF, also the last possible character in Unicode
  expect(autodetectValidUTF8(new Uint8Array([0xf4, 0x8f, 0xbf, 0xbf]))).toBe(true)
})

test('autodetectDoubleEncoded', () => {
  const e = (input: string) => new TextEncoder().encode(input)

  const de = function (input: string) {
    const firstEncode = [...e(input)].map((b: number) => String.fromCharCode(b)).join('')
    return e(firstEncode)
  }

  // sanity check our helper functions
  expect(e('👋')).length(4)
  expect(e('👋')).toEqual(new Uint8Array([0xf0, 0x9f, 0x91, 0x8b]))
  expect(de('👋')).length(8)
  expect(de('👋')).toEqual(new Uint8Array([0xc3, 0xb0, 0xc2, 0x9f, 0xc2, 0x91, 0xc2, 0x8b]))

  expect(autodetectDoubleEncoded(e('¿Si o Sí?'))).toBe(false)
  const si_double_encoded = new Uint8Array([
    0xc3, 0x82, 0xc2, 0xbf, 0x53, 0x69, 0x20, 0x6f, 0x20, 0x53, 0xc3, 0x83, 0xc2, 0xad, 0x3f,
  ])
  expect(autodetectDoubleEncoded(si_double_encoded)).toBe(true)

  const testStrings = [
    'Hello! 👋',
    '⭐',
    '💀',
    '⛷️',
    'κόσμε',
    'déçu',
    'þjófum',
    'イロハニホヘト',
    'Съешь',
    'أزرق',
    'מאוכזב',
    'ฌานสมาธิ',
    'გვიპყრობდა',
    'օճառաջուր',
    'trång',
    'Zażółć',
    'ပင်မစာမျက်နှာ',
  ]

  for (const str of testStrings) {
    expect(autodetectDoubleEncoded(e(str))).toBe(false)
    expect(autodetectDoubleEncoded(de(str))).toBe(true)
  }
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

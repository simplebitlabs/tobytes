import { expect, test } from 'vitest'

import { base64ToBytes } from './input'
import { isValidUTF8, doubleEncodedUTF8 } from './utf8'

test('isValidUTF8', () => {
  const original = 'Benjamín pidió una bebida de kiwi y fresa. Noé, sin vergüenza, la más exquisita champaña del menú.'
  // encoded to CP1252 via this command:
  // echo $str | iconv -f UTF-8 -t CP1252 | base64
  const cp1252base64 =
    'QmVuamFt7W4gcGlkafMgdW5hIGJlYmlkYSBkZSBraXdpIHkgZnJlc2EuIE5v6Swgc2luIHZlcmf8ZW56YSwgbGEgbeFzIGV4cXVpc2l0YSBjaGFtcGHxYSBkZWwgbWVu+i4K'

  const originalAsBytes = new TextEncoder().encode(original)
  expect(isValidUTF8(originalAsBytes)).toBe(true)

  const cp1252AsBytes = base64ToBytes(cp1252base64)
  expect(isValidUTF8(cp1252AsBytes)).toBe(false)

  const lotsOfCharacters =
    'Hello! © 👋 ⭐ 💀 ⛷️ pidió κόσμε déçu þjófum イロハニホヘト Съешь ฌานสมาธิ გვიპყრობდა օճառաջուր trång Zażółć'
  const lotsofBytes = new TextEncoder().encode(lotsOfCharacters)
  expect(isValidUTF8(lotsofBytes)).toBe(true)

  // single byte invalid sequences
  expect(isValidUTF8(new Uint8Array([0xc0]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xc1]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xf7]))).toBe(false)

  // continuation byte with nothing before it
  expect(isValidUTF8(new Uint8Array([0x80]))).toBe(false)

  // first byte with nothing after it
  expect(isValidUTF8(new Uint8Array([0xe0]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xe1]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xed]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xee]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xf0]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xf1]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xf4]))).toBe(false)

  // various "overlong encodings" should be seen as invalid
  expect(isValidUTF8(new Uint8Array([0xc0, 0xaf]))).toBe(false)
  expect(isValidUTF8(new Uint8Array([0xe0, 0x9f, 0x80]))).toBe(false)

  // our friend the BOM is a valid string
  expect(isValidUTF8(new Uint8Array([0xef, 0xbb, 0xbf]))).toBe(true)

  // unicode non-characters U+FFFE and U+FFFF should be seen as OK, as UTF requires it
  expect(isValidUTF8(new Uint8Array([0xef, 0xbf, 0xbe]))).toBe(true)
  expect(isValidUTF8(new Uint8Array([0xef, 0xbf, 0xbf]))).toBe(true)
  // same thing for U+10FFFF, also the last possible character in Unicode
  expect(isValidUTF8(new Uint8Array([0xf4, 0x8f, 0xbf, 0xbf]))).toBe(true)
})

test('autodetectDoubleEncoded', () => {
  const e = (input: string) => new TextEncoder().encode(input)

  const de = function (input: string) {
    const firstEncode = [...e(input)].map((b: number) => String.fromCodePoint(b)).join('')
    return e(firstEncode)
  }

  // sanity check our helper functions
  expect(e('👋')).length(4)
  expect(e('👋')).toEqual(new Uint8Array([0xf0, 0x9f, 0x91, 0x8b]))
  expect(de('👋')).length(8)
  expect(de('👋')).toEqual(new Uint8Array([0xc3, 0xb0, 0xc2, 0x9f, 0xc2, 0x91, 0xc2, 0x8b]))

  expect(doubleEncodedUTF8(e('¿Si o Sí?'))).toBe(false)
  const si_double_encoded = new Uint8Array([
    0xc3, 0x82, 0xc2, 0xbf, 0x53, 0x69, 0x20, 0x6f, 0x20, 0x53, 0xc3, 0x83, 0xc2, 0xad, 0x3f,
  ])
  expect(doubleEncodedUTF8(si_double_encoded)).toBe(true)

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
    expect(doubleEncodedUTF8(e(str))).toBe(false)
    expect(doubleEncodedUTF8(de(str))).toBe(true)
  }
})

import { expect, test } from 'vitest'

import { value, valueClass } from './hex_output_helpers'

test('value', () => {
  // default hex-only
  expect(value(0x21, false, false)).toBe('21')
  expect(value(0x7e, false, false)).toBe('7e')
  expect(value(0x08, false, false)).toBe('08')
  expect(value(0x09, false, false)).toBe('09')
  expect(value(0x0a, false, false)).toBe('0a')
  expect(value(0x0b, false, false)).toBe('0b')
  expect(value(0x0c, false, false)).toBe('0c')
  expect(value(0x0d, false, false)).toBe('0d')
  expect(value(0x7f, false, false)).toBe('7f')

  // ASCII-like
  expect(value(0x21, true, false)).toBe('!')
  expect(value(0x7e, true, false)).toBe('~')
  expect(value(0x08, true, false)).toBe('\\b')
  expect(value(0x09, true, false)).toBe('\\t')
  expect(value(0x0a, true, false)).toBe('\\n')
  expect(value(0x0b, true, false)).toBe('\\v')
  expect(value(0x0c, true, false)).toBe('\\f')
  expect(value(0x0d, true, false)).toBe('\\r')
  expect(value(0x7f, true, false)).toBe('7f')

  // Control Character pictures
  expect(value(0x21, true, true)).toBe('!')
  expect(value(0x7e, true, true)).toBe('~')
  expect(value(0x08, true, true)).toBe('␈')
  expect(value(0x09, true, true)).toBe('␉')
  expect(value(0x0a, true, true)).toBe('␊')
  expect(value(0x0b, true, true)).toBe('␋')
  expect(value(0x0c, true, true)).toBe('␌')
  expect(value(0x0d, true, true)).toBe('␍')
  expect(value(0x7f, true, true)).toBe('␡')

  // spaces are special based on flags
  expect(value(0x20, false, false)).toBe('20')
  expect(value(0x20, true, false)).toBe('\u00a0')
  expect(value(0x20, true, true)).toBe('␠')
})

test('valueClass', () => {
  expect(valueClass('a'.codePointAt(0) || -1, false)).toBe('p')
  expect(valueClass('a'.codePointAt(0) || -1, true)).toBe('p')

  expect(valueClass(' '.codePointAt(0) || -1, false)).toBe('sp')
  expect(valueClass(' '.codePointAt(0) || -1, true)).toBe('spu')

  expect(valueClass('\t'.codePointAt(0) || -1, false)).toBe('tb')
  expect(valueClass('\t'.codePointAt(0) || -1, true)).toBe('tb')

  expect(valueClass('\n'.codePointAt(0) || -1, false)).toBe('nl')
  expect(valueClass('\n'.codePointAt(0) || -1, true)).toBe('nl')

  expect(valueClass(0xf0, false)).toBe('bn')
  expect(valueClass(0xf0, true)).toBe('bn')
})

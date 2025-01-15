import { expect, test } from 'vitest'

import {
  ConversionError,
  escapeSequenceToBytes,
  hexToBytes,
  base64ToBytes,
  bytesToBase64,
  bytesToUTF8,
  InputType,
  autodetectInputType,
  DataType,
  autodetectDataType,
  exportData,
} from './b2x'

test('escapeSequenceToBytes', () => {
  const enc = (str: string) => new TextEncoder().encode(str)
  expect(escapeSequenceToBytes('')).toEqual(new Uint8Array())
  expect(escapeSequenceToBytes('\r\n')).toEqual(new Uint8Array([0x0d, 0x0a]))
  expect(escapeSequenceToBytes('\\r\\n')).toEqual(new Uint8Array([0x0d, 0x0a]))

  expect(escapeSequenceToBytes('test\\tTSV')).toEqual(enc('test\tTSV'))
  // note that JS doesn't support \a and \e, but our conversion function does
  expect(escapeSequenceToBytes('\\a\\b\\e\\f\\n\\r\\t\\v')).toEqual(enc('\x07\b\x1b\f\n\r\t\v'))
  expect(escapeSequenceToBytes('\\\\')).toEqual(enc('\\'))
  expect(escapeSequenceToBytes("\\'")).toEqual(enc("'"))
  expect(escapeSequenceToBytes('\\"')).toEqual(enc('"'))

  // the string "why?", done in a very weird way (octal, hex, short unicode, long unicode)
  expect(escapeSequenceToBytes('\\167\\x68\\u0079\\U0000003F')).toEqual(enc('why?'))

  expect(escapeSequenceToBytes('\\U0001F600')).toEqual(enc('😀'))
})

test('hexToBytes', () => {
  expect(hexToBytes('68656c6c6f0a')).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]))
  expect(hexToBytes('\\x68656c6c6f0a')).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]))
  expect(hexToBytes('0x68656c6c6f0a')).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]))
  expect(hexToBytes('68 65 6c 6c 6f 0a')).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]))
  expect(() => hexToBytes('not hex')).toThrow(ConversionError)
  expect(() => hexToBytes('12 34 5')).toThrow(ConversionError) // not an even number of hex digits
})

test('base64ToBytes', () => {
  expect(base64ToBytes('SGVsbG8hIPCfkYsK')).toEqual(
    new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0x20, 0xf0, 0x9f, 0x91, 0x8b, 0x0a]),
  )

  expect(() => base64ToBytes('z')).toThrow(ConversionError)
  expect(() => base64ToBytes('z=z')).toThrow(ConversionError)
  expect(() => base64ToBytes('z', true)).toThrow(ConversionError)
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

test('autodetectDataType', () => {
  const e = (input: string) => new TextEncoder().encode(input)
  expect(autodetectDataType(e('hello world'))).toBe(DataType.ASCII)
  expect(autodetectDataType(e('hello\tworld\r\n'))).toBe(DataType.ASCII)
  expect(autodetectDataType(e('bell: \x07'))).toBe(DataType.Binary)
  expect(autodetectDataType(e('check: ✅'))).toBe(DataType.UTF8)
  expect(autodetectDataType(e('wave: 👋'))).toBe(DataType.UTF8)
  expect(autodetectDataType(e('adiós'))).toBe(DataType.UTF8)
})

test('exportData', () => {
  const abc_text = new Uint8Array([0x41, 0x42, 0x43]) // all caps ABC
  expect(exportData('utf8', abc_text)).toBe('ABC')
  expect(exportData('base64', abc_text)).toBe('QUJD')
  expect(exportData('base64url', abc_text)).toBe('QUJD')
  expect(exportData('lowerhex', abc_text)).toBe('414243')
  expect(exportData('upperhex', abc_text)).toBe('414243')
  expect(exportData('lowerhexspace', abc_text)).toBe('41 42 43')
  expect(exportData('upperhexspace', abc_text)).toBe('41 42 43')
  expect(exportData('hexarray', abc_text)).toBe('[0x41, 0x42, 0x43]')
  expect(exportData('postgresbytea', abc_text)).toBe('\\x414243')
})

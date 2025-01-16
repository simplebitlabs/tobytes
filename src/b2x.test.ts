import { expect, test } from 'vitest'

import {
  ConversionError,
  escapeSequenceToBytes,
  hexToBytes,
  base64ToBytes,
  qpToBytes,
  bytesToBase64,
  bytesToUTF8,
  InputType,
  friendlyInputType,
  autodetectInputType,
  DataType,
  friendlyDataType,
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

  // test some out of range values - \377 is max octal
  // should be interpreted as '\37' followed by '8'
  expect(escapeSequenceToBytes('\\378')).toEqual(new Uint8Array([0o37, 0x38]))
  // should just be passed through as is, since it is greater than 255 (decimal)
  expect(escapeSequenceToBytes('\\477')).toEqual(enc('\\477'))

  // max unicode code point is 0x10ffff, so anything bigger should just be ignored
  expect(escapeSequenceToBytes('\\U0010FFFF')).toEqual(new Uint8Array([0xf4, 0x8f, 0xbf, 0xbf]))
  expect(escapeSequenceToBytes('\\U00110000')).toEqual(enc('\\U00110000'))
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

test('qpToBytes', () => {
  const input = '=E2=80=94=E2=80=89Antoine de Saint-Exup=C3=A9ry, Citadelle (1948) '
  const output = '— Antoine de Saint-Exupéry, Citadelle (1948)'
  expect(qpToBytes(input)).toEqual(new TextEncoder().encode(output))
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

test('friendlyInputType', () => {
  expect(friendlyInputType(InputType.CEscape)).toEqual('C-like Escape Sequence')
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

  // looks like hex, but isn't an even number of digits
  expect(autodetectInputType('abc12')).toBe(InputType.ASCII)

  // note the double escaped slashes, as if the user just typed `\n` in the input
  expect(autodetectInputType('abc\\n123')).toBe(InputType.CEscape)
  expect(autodetectInputType('\\x20\\x20')).toBe(InputType.CEscape)
})

test('friendlyDataType', () => {
  expect(friendlyDataType(DataType.UTF8)).toEqual('UTF-8')
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

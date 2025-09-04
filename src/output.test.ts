import { expect, test } from 'vitest'

import {
  bytesToBase64,
  bytesToUTF8,
  DataType,
  friendlyDataType,
  autodetectDataType,
  CopyType,
  exportData,
} from './output'

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

test('friendlyDataType', () => {
  expect(friendlyDataType(DataType.UTF8)).toEqual('UTF-8')
})

const enc = (input: string) => new TextEncoder().encode(input)

test('autodetectDataType', () => {
  expect(autodetectDataType(enc(''))).toBe(DataType.Unknown)
  expect(autodetectDataType(enc('hello world'))).toBe(DataType.ASCIIPrintable)
  expect(autodetectDataType(enc('hello\tworld\r\n'))).toBe(DataType.ASCIIPrintable)
  expect(autodetectDataType(enc('bell: \x07'))).toBe(DataType.ASCII)
  expect(autodetectDataType(enc('check: ✅'))).toBe(DataType.UTF8)
  expect(autodetectDataType(enc('wave: 👋'))).toBe(DataType.UTF8)
  expect(autodetectDataType(enc('adiós'))).toBe(DataType.UTF8)

  expect(autodetectDataType(new Uint8Array([0x6a, 0xc7, 0x5f, 0xb1, 0xa7, 0x5f, 0xb1, 0xd7]))).toBe(DataType.Binary)
})

test('exportData', () => {
  const abc_text = new Uint8Array([0x41, 0x42, 0x43]) // all caps ABC
  expect(exportData(CopyType.UTF8, abc_text)).toBe('ABC')
  expect(exportData(CopyType.Base64, abc_text)).toBe('QUJD')
  expect(exportData(CopyType.Base64URL, abc_text)).toBe('QUJD')
  expect(exportData(CopyType.LowerHex, abc_text)).toBe('414243')
  expect(exportData(CopyType.UpperHex, abc_text)).toBe('414243')
  expect(exportData(CopyType.LowerHexSpace, abc_text)).toBe('41 42 43')
  expect(exportData(CopyType.UpperHexSpace, abc_text)).toBe('41 42 43')
  expect(exportData(CopyType.HexArray, abc_text)).toBe('[0x41, 0x42, 0x43]')
  expect(exportData(CopyType.PostgresBytea, abc_text)).toBe('\\x414243')
  expect(exportData(CopyType.CEscape, abc_text)).toBe('"ABC"')

  // Hello! 👋 (with trailing newline)
  const hello_wave = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0x20, 0xf0, 0x9f, 0x91, 0x8b, 0x0a])
  expect(exportData(CopyType.CEscape, hello_wave)).toBe('"Hello! \\U0001f44b\\n"')
})

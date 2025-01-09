import { expect, test } from 'vitest'

import { hexToBytes, bytesToUTF8 } from './b2x'

test('bytesToUTF8 with BOM', () => {
  const input = [0xef, 0xbb, 0xbf, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x0a] // BOM followed by "hello\n"
  const expectedOutput = 'hello\n'
  expect(bytesToUTF8(input)).toBe(expectedOutput)
})

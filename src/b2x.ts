function hexToBytes(hex: string): Uint8Array | undefined {
  if (hex.startsWith('\\x') || hex.startsWith('0x')) {
    hex = hex.slice(2)
  }
  if (!/^[a-fA-F0-9 \r\n\t]+$/.test(hex)) {
    return undefined
  }
  // remove whitespace before we ensure the length is right
  const cleaned = hex.replace(/\s+/g, '')
  if (cleaned.length % 2 !== 0) {
    console.warn('input looked like hex, but was odd length')
    return undefined
  }
  const array = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < array.length; i++) {
    array[i] = parseInt(cleaned.substring(i * 2, i * 2 + 2), 16)
  }
  return array
}

function base64ToBytes(base64: string, urlFormat: boolean = false): Uint8Array {
  // TODO: handle missing padding, here and in base64
  if (typeof window !== 'undefined') {
    let val = base64
    if (urlFormat) {
      val = base64.replace(/-/g, '+').replace(/_/g, '/')
    }
    const binary = window.atob(val)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i)
    }
    return array
  } else {
    return Buffer.from(base64, urlFormat ? 'base64url' : 'base64')
  }
}

function bytesToBase64(bytes: number[] | Uint8Array, urlFormat: boolean = false): string {
  let base64 = ''
  // TODO: handle missing padding, here and in base64
  if (typeof window !== 'undefined') {
    const asString = Array.from(bytes, (b) => String.fromCodePoint(b)).join('')
    base64 = window.btoa(asString)
    if (urlFormat) {
      base64 = base64.replace(/\+/g, '-').replace(/\//g, '_')
    }
  } else {
    const buf = Buffer.from(bytes)
    base64 = buf.toString(urlFormat ? 'base64url' : 'base64')
  }
  return base64
}

function bytesToUTF8(bytes: number[] | Uint8Array): string {
  // ignoreBOM == false actually means... skip the BOM, not include it
  // for our purposes, we want to keep all bytes present in the input
  const decoder = new TextDecoder('utf-8', { ignoreBOM: true })
  return decoder.decode(new Uint8Array(bytes))
}

enum InputType {
  Unknown = 0,
  Hexadecimal = 1,
  Base64,
  Base64URL,
  ASCII,
  UTF8,
}

const inputTypeNames: Record<InputType, string> = {
  [InputType.Unknown]: 'Unknown',
  [InputType.Hexadecimal]: 'Hexadecimal',
  [InputType.Base64]: 'Base 64',
  [InputType.Base64URL]: 'Base 64 URL',
  [InputType.ASCII]: 'ASCII',
  [InputType.UTF8]: 'UTF-8',
}

function friendlyInputType(value: InputType): string {
  return inputTypeNames[value] || InputType[value]
}

function autodetectInputType(input: string): InputType {
  let inputForHex = input
  if (input.startsWith('0x') || input.startsWith('\\x')) {
    inputForHex = input.slice(2)
  }
  if (/^[a-fA-F0-9 \r\n\t]+$/.test(inputForHex)) {
    // Hexadecimal input without '0x' or '\x' prefix
    return InputType.Hexadecimal
  }
  if (/^[A-Za-z0-9+/ \r\n\t]+=?=?[ \r\n\t]*$/.test(input)) {
    // TODO: detect and report missing or invalid padding based on length
    try {
      base64ToBytes(input)
      return InputType.Base64
    } catch (error) {
      console.info('base64 decode failed, not assuming string is base64', error)
    }
  }
  if (/^[a-zA-Z0-9-_ \r\n\t]+=?=?$/.test(input)) {
    // TODO: detect and report missing or invalid padding based on length
    try {
      base64ToBytes(input, true)
      return InputType.Base64URL
    } catch (error) {
      console.info('base64 decode failed, not assuming string is base64', error)
    }
  }
  // oxlint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(input)) {
    return InputType.ASCII
  }
  return InputType.UTF8
}

function autodetectValidUTF8(input: Uint8Array): boolean {
  const between = (b: number, lower: number, upper: number) => b >= lower && b <= upper
  const continuation = (b: number) => b >= 0x80 && b <= 0xbf

  for (let i = 0; i < input.length; ) {
    const i0 = input[i]
    // these characters are never present in valid UTF-8
    if (i0 == 0xc0 || i0 == 0xc1 || i0 >= 0xf5) {
      return false
    }
    // 7-bit ASCII characters are OK
    if (i0 < 0x80) {
      i++
    } else if (between(i0, 0xc2, 0xdf)) {
      if (i >= input.length - 1 || !continuation(input[i + 1])) {
        return false
      }
      i += 2
    } else if (i0 == 0xe0) {
      if (i >= input.length - 2 || !between(input[i + 1], 0xa0, 0xbf) || !continuation(input[i + 2])) {
        return false
      }
      i += 3
    } else if (between(i0, 0xe1, 0xec)) {
      if (i >= input.length - 2 || !continuation(input[i + 1]) || !continuation(input[i + 2])) {
        return false
      }
      i += 3
    } else if (i0 == 0xed) {
      if (i >= input.length - 2 || !between(input[i + 1], 0x80, 0x9f) || !continuation(input[i + 2])) {
        return false
      }
      i += 3
    } else if (between(i0, 0xee, 0xef)) {
      if (i >= input.length - 2 || !continuation(input[i + 1]) || !continuation(input[i + 2])) {
        return false
      }
      i += 3
    } else if (i0 == 0xf0) {
      if (
        i >= input.length - 3 ||
        !between(input[i + 1], 0x90, 0xbf) ||
        !continuation(input[i + 2]) ||
        !continuation(input[i + 3])
      ) {
        return false
      }
      i += 4
    } else if (between(i0, 0xf1, 0xf3)) {
      if (
        i >= input.length - 3 ||
        !continuation(input[i + 1]) ||
        !continuation(input[i + 2]) ||
        !continuation(input[i + 3])
      ) {
        return false
      }
      i += 4
    } else if (i0 == 0xf4) {
      if (
        i >= input.length - 3 ||
        !between(input[i + 1], 0x80, 0x8f) ||
        !continuation(input[i + 2]) ||
        !continuation(input[i + 3])
      ) {
        return false
      }
      i += 4
    } else {
      // anything else, such as a continuation byte, makes this invalid UTF-8
      return false
    }
  }

  return true
}

function autodetectDoubleEncoded(input: Uint8Array): boolean {
  const between = (b: number, lower: number, upper: number) => b >= lower && b <= upper
  const continuation = (b: number) => b >= 0x80 && b <= 0xbf

  // the basic pattern is "C3 xx C2 xx" for many of these.
  // Derived from the regex at https://blogs.perl.org/users/chansen/2010/10/coping-with-double-encoded-utf-8.html
  for (let i = 0; i < input.length - 3; i++) {
    if (input[i] != 0xc3 || input[i + 2] != 0xc2) {
      continue
    }
    const i1 = input[i + 1]
    const i3 = input[i + 3]
    // 4 byte sequence
    if (between(i1, 0x82, 0x9f) && continuation(i3)) {
      return true
    }
    // 6 byte sequences
    if (i < input.length - 5 && input[i + 4] == 0xc2) {
      const i5 = input[i + 5]
      if (i1 == 0xa0 && between(i3, 0xa0, 0xbf) && continuation(i5)) {
        return true
      }
      if (between(i1, 0xa1, 0xac) && continuation(i3) && continuation(i5)) {
        return true
      }
      if (i1 == 0xad && between(i3, 0x80, 0x9f) && continuation(i5)) {
        return true
      }
      if (between(i1, 0xae, 0xaf) && continuation(i3) && continuation(i5)) {
        return true
      }
      // 8 byte sequences
      if (i < input.length - 7 && input[i + 6] == 0xc2) {
        const i7 = input[i + 7]
        if (i1 == 0xb0 && between(i3, 0x90, 0xbf) && continuation(i5) && continuation(i7)) {
          return true
        }
        if (between(i1, 0xb1, 0xb3) && continuation(i3) && continuation(i5) && continuation(i7)) {
          return true
        }
        if (i1 == 0xb4 && between(i3, 0x80, 0x8f) && continuation(i5) && continuation(i7)) {
          return true
        }
      }
    }
  }
  return false
}

// TODO: add support for autodetecting Double Encoded UTF-8
// https://blogs.perl.org/users/chansen/2010/10/coping-with-double-encoded-utf-8.html
// https://stackoverflow.com/questions/11546351/what-character-encoding-is-c3-82-c2-bf
// https://metacpan.org/pod/Encode::DoubleEncodedUTF8

enum DataType {
  Unknown = 0,
  Binary,
  ASCII,
  //ISO88591,
  //ISO885915,
  UTF8,
  //Windows1252,
}

const dataTypeNames: Record<DataType, string> = {
  [DataType.Unknown]: 'Unknown',
  [DataType.Binary]: 'Binary',
  [DataType.ASCII]: 'ASCII',
  [DataType.UTF8]: 'UTF-8',
}

function friendlyDataType(value: DataType): string {
  return dataTypeNames[value] || DataType[value]
}

function autodetectDataType(bytes: number[] | Uint8Array): DataType {
  // printable characters + horizontal tab, LF, CR
  const ascii = (b: number) => (b >= 0x20 && b <= 0x7e) || b == 0x09 || b == 0x0a || b == 0x0d
  // From https://en.wikipedia.org/wiki/UTF-8#Byte_map
  const isUTF8Continuation = (b: number) => b >= 0x80 && b <= 0xbf
  const notInUTF8 = (b: number) => b == 0xc0 || b == 0xc1 || (b >= 0xf5 && b <= 0xff)
  if (bytes.every(ascii)) {
    return DataType.ASCII
  } else if (bytes.some(isUTF8Continuation) && !bytes.some(notInUTF8)) {
    return DataType.UTF8
  } else if (bytes.some((b) => (b >= 0x00 && b <= 0x1f) || b == 0x7f)) {
    return DataType.Binary
  }
  return DataType.Unknown
}

function exportHexHelper(data: number[] | Uint8Array, spacer: string, uppercase: boolean) {
  const text = [...data].map((b) => b.toString(16).padStart(2, '0')).join(spacer)
  if (uppercase) return text.toUpperCase()
  return text
}

function exportData(copyType: string, data: Uint8Array): string {
  let text = ''
  switch (copyType) {
    case 'utf8':
      text = bytesToUTF8(data)
      break
    case 'base64':
      text = bytesToBase64(data, false)
      break
    case 'base64url':
      text = bytesToBase64(data, true)
      break
    case 'lowerhex':
      text = exportHexHelper(data, '', false)
      break
    case 'upperhex':
      text = exportHexHelper(data, '', true)
      break
    case 'lowerhexspace':
      text = exportHexHelper(data, ' ', false)
      break
    case 'upperhexspace':
      text = exportHexHelper(data, ' ', true)
      break
    case 'hexarray':
      text = '[' + [...data].map((b) => '0x' + b.toString(16).padStart(2, '0')).join(', ') + ']'
      break
    case 'postgresbytea':
      text = '\\x' + exportHexHelper(data, '', false)
      break
  }
  return text
}

export {
  hexToBytes,
  base64ToBytes,
  bytesToBase64,
  bytesToUTF8,
  InputType,
  friendlyInputType,
  autodetectInputType,
  autodetectValidUTF8,
  autodetectDoubleEncoded,
  DataType,
  friendlyDataType,
  autodetectDataType,
  exportData,
}

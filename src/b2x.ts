// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number = 300): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = undefined
    }, delay)
  }
}

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

function bytesToUTF8(bytes: number[] | Uint8Array, doubleEncoded: boolean = false): string {
  // ignoreBOM == false actually means... skip the BOM, not include it
  // for our purposes, we want to keep all bytes present in the input
  const decoder = new TextDecoder('utf-8', { ignoreBOM: true })
  let str = decoder.decode(new Uint8Array(bytes))
  if (doubleEncoded) {
    str = decoder.decode(Uint8Array.from(str, (c) => c.charCodeAt(0)))
  }
  return str
}

enum InputType {
  Unknown = 0,
  Hexadecimal = 1,
  Base64,
  Base64URL,
  ASCII,
  UTF8,
  UTF8DE,
}

const inputTypeNames: Record<InputType, string> = {
  [InputType.Unknown]: 'Unknown',
  [InputType.Hexadecimal]: 'Hexadecimal',
  [InputType.Base64]: 'Base 64',
  [InputType.Base64URL]: 'Base 64 URL',
  [InputType.ASCII]: 'ASCII',
  [InputType.UTF8]: 'UTF-8',
  [InputType.UTF8DE]: 'UTF-8, Double Encoded',
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

// TODO: add support for autodetecting Double Encoded UTF-8
// https://blogs.perl.org/users/chansen/2010/10/coping-with-double-encoded-utf-8.html
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

export {
  debounce,
  hexToBytes,
  base64ToBytes,
  bytesToBase64,
  bytesToUTF8,
  InputType,
  friendlyInputType,
  autodetectInputType,
  DataType,
  friendlyDataType,
  autodetectDataType,
}

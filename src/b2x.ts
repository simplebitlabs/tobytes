class ConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConversionError'
    Object.setPrototypeOf(this, ConversionError.prototype)
  }
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith('\\x') || hex.startsWith('0x')) {
    hex = hex.slice(2)
  }
  if (!/^[a-fA-F0-9 \r\n\t]+$/.test(hex)) {
    throw new ConversionError('not hex')
  }
  // remove whitespace before we ensure the length is right
  const cleaned = hex.replace(/\s+/g, '')
  if (cleaned.length % 2 !== 0) {
    throw new ConversionError('not hex (odd length)')
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
    let binary: string
    try {
      binary = window.atob(val)
    } catch (e) {
      if (e instanceof Error && e.name === 'InvalidCharacterError') {
        throw new ConversionError(urlFormat ? 'not base64url' : 'not base64')
      } else {
        throw e
      }
    }
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i)
    }
    return array
  } else {
    return new Uint8Array(Buffer.from(base64, urlFormat ? 'base64url' : 'base64'))
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

function canConvert(callback: () => void): boolean {
  try {
    callback()
    return true
  } catch (e) {
    if (e instanceof ConversionError) {
      console.debug('autodetect failed:', e.message)
    } else {
      throw e
    }
  }
  return false
}

function autodetectInputType(input: string): InputType {
  let inputForHex = input
  if (input.startsWith('0x') || input.startsWith('\\x')) {
    inputForHex = input.slice(2)
  }
  if (/^[a-fA-F0-9 \r\n\t]+$/.test(inputForHex)) {
    if (canConvert(() => hexToBytes(inputForHex))) {
      return InputType.Hexadecimal
    }
  }
  if (/^[A-Za-z0-9+/ \r\n\t]+=?=?[ \r\n\t]*$/.test(input)) {
    // TODO: detect and report missing or invalid padding based on length
    if (canConvert(() => base64ToBytes(input, false))) {
      return InputType.Base64
    }
  }
  if (/^[a-zA-Z0-9-_ \r\n\t]+=?=?$/.test(input)) {
    // TODO: detect and report missing or invalid padding based on length
    if (canConvert(() => base64ToBytes(input, true))) {
      return InputType.Base64URL
    }
  }
  // oxlint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(input)) {
    return InputType.ASCII
  }
  return InputType.UTF8
}

enum DataType {
  Unknown = 0,
  Binary,
  ASCII,
  UTF8,
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
  ConversionError,
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
  exportData,
}

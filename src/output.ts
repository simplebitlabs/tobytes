import { isValidUTF8 } from './utf8'

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

enum DataType {
  Unknown = 0,
  Binary,
  ASCIIPrintable,
  ASCII,
  UTF8,
}

const dataTypeNames: Record<DataType, string> = {
  [DataType.Unknown]: 'Unknown',
  [DataType.Binary]: 'Binary',
  [DataType.ASCIIPrintable]: 'ASCII (Printable)',
  [DataType.ASCII]: 'ASCII',
  [DataType.UTF8]: 'UTF-8',
}

function friendlyDataType(value: DataType): string {
  return dataTypeNames[value] || DataType[value]
}

function autodetectDataType(bytes: Uint8Array): DataType {
  // printable characters + horizontal tab, LF, CR
  const asciiPrintable = (b: number) => (b >= 0x20 && b <= 0x7e) || b == 0x09 || b == 0x0a || b == 0x0d
  const ascii = (b: number) => b <= 0x7f

  if (bytes.length == 0) {
    return DataType.Unknown
  } else if (bytes.every(asciiPrintable)) {
    return DataType.ASCIIPrintable
  } else if (bytes.every(ascii)) {
    return DataType.ASCII
  } else if (isValidUTF8(bytes)) {
    return DataType.UTF8
  }
  return DataType.Binary
}

enum CopyType {
  UTF8 = 'utf8',
  Base64 = 'base64',
  Base64URL = 'base64url',
  LowerHex = 'lowerhex',
  UpperHex = 'upperhex',
  LowerHexSpace = 'lowerhexspace',
  UpperHexSpace = 'upperhexspace',
  HexArray = 'hexarray',
  PostgresBytea = 'postgresbytea',
  CEscape = 'cescape',
}

function assertUnreachable(_x: never): never {
  throw new Error('Should be unreachable')
}

function exportHexHelper(data: number[] | Uint8Array, spacer: string, uppercase: boolean): string {
  const text = [...data].map((b) => b.toString(16).padStart(2, '0')).join(spacer)
  return uppercase ? text.toUpperCase() : text
}

const escapeMapping: Record<number, string> = {
  0x00: '\\0', // octal escape
  0x08: '\\b',
  0x09: '\\t',
  0x0a: '\\n',
  0x0b: '\\v',
  0x0c: '\\f',
  0x0d: '\\r',
  0x22: '\\"',
  0x27: "\\'",
  0x5c: '\\\\',
}

function cEscapeChar(c: number): string {
  if (escapeMapping[c] !== undefined) {
    return escapeMapping[c]
  } else if (c < 0) {
    return '\\ufffd'
  } else if (c >= 0x20 && c <= 0x7e) {
    return String.fromCodePoint(c)
  } else if (c <= 0xff) {
    return '\\x' + c.toString(16).padStart(2, '0')
  } else if (c <= 0xffff) {
    return '\\u' + c.toString(16).padStart(4, '0')
  } else {
    return '\\U' + c.toString(16).padStart(8, '0')
  }
}

function exportCEscape(data: number[] | Uint8Array, isValidUTF8: boolean): string {
  let chars: string[]
  if (isValidUTF8) {
    const utf8 = bytesToUTF8(data)
    chars = [...utf8].map((c) => cEscapeChar(c.codePointAt(0) ?? -1))
  } else {
    chars = [...data].map((c) => cEscapeChar(c))
  }
  return '"' + chars.join('') + '"'
}

function exportData(copyType: CopyType, data: Uint8Array): string {
  let text = ''
  switch (copyType) {
    case CopyType.UTF8:
      text = bytesToUTF8(data)
      break
    case CopyType.Base64:
      text = bytesToBase64(data, false)
      break
    case CopyType.Base64URL:
      text = bytesToBase64(data, true)
      break
    case CopyType.LowerHex:
      text = exportHexHelper(data, '', false)
      break
    case CopyType.UpperHex:
      text = exportHexHelper(data, '', true)
      break
    case CopyType.LowerHexSpace:
      text = exportHexHelper(data, ' ', false)
      break
    case CopyType.UpperHexSpace:
      text = exportHexHelper(data, ' ', true)
      break
    case CopyType.HexArray:
      text = '[' + [...data].map((b) => '0x' + b.toString(16).padStart(2, '0')).join(', ') + ']'
      break
    case CopyType.PostgresBytea:
      text = '\\x' + exportHexHelper(data, '', false)
      break
    case CopyType.CEscape:
      // TODO: un-hardcode the isValidUTF8 parameter
      text = exportCEscape(data, true)
      break
    default:
      assertUnreachable(copyType)
  }
  return text
}

export { bytesToBase64, bytesToUTF8, DataType, friendlyDataType, autodetectDataType, CopyType, exportData }

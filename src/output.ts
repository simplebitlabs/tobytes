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

export { bytesToBase64, bytesToUTF8, DataType, friendlyDataType, autodetectDataType, exportData }

class ConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConversionError'
    Object.setPrototypeOf(this, ConversionError.prototype)
  }
}

function escapeReplacer(match: string, grp: string): string {
  switch (grp[0]) {
    case 'a':
      return '\x07'
    case 'b':
      return '\b'
    case 'e':
      return '\x1B'
    case 'f':
      return '\f'
    case 'n':
      return '\n'
    case 'r':
      return '\r'
    case 't':
      return '\t'
    case 'v':
      return '\v'
    case '\\':
      return '\\'
    case "'":
      return "'"
    case '"':
      return '"'
    case 'x':
    case 'u':
    case 'U':
      // slice off the x/u/U prefix, and assume regex already validated the number of digits
      const num = parseInt(grp.slice(1), 16)
      if (!isNaN(num) && num <= 0x10ffff) {
        return String.fromCodePoint(num)
      } else {
        // for now, just ignore out of range characters and pass through original match
        return match
      }
    default:
      // handles octal escapes, which have no prefix
      if (grp.length <= 3 && /^\d+$/.test(grp)) {
        const num = parseInt(grp, 8)
        if (!isNaN(num) && num <= 0xff) {
          return String.fromCodePoint(num)
        } else {
          // for now, just ignore out of range characters and pass through original match
          return match
        }
      } else {
        throw new ConversionError(`Invalid escape sequence: \\${grp}`)
      }
  }
}

function escapeSequenceToBytes(escaped: string): Uint8Array {
  // note: C also supports \? to avoid trigraphs, but I didn't include it here
  const escapeChars = /\\([abefnrtv\\'"]|[0-7]{1,3}|x[a-fA-F0-9]{2}|u[a-fA-F0-9]{4}|U[a-fA-F0-9]{8})/g
  escaped = escaped.replace(escapeChars, escapeReplacer)
  return new TextEncoder().encode(escaped)
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
      array[i] = binary.codePointAt(i) ?? -1
    }
    return array
  } else {
    return new Uint8Array(Buffer.from(base64, urlFormat ? 'base64url' : 'base64'))
  }
}

function qpToBytes(qp: string): Uint8Array {
  const decoded = qp
    .replace(/[\t ]$/gm, '')
    .replace(/=(?:\r\n?|\n|$)/g, '')
    .replace(/=([a-fA-F0-9]{2})/g, (_, grp: string) => {
      const codePoint = parseInt(grp, 16)
      return String.fromCodePoint(codePoint)
    })
  return Uint8Array.from(decoded, (c) => c.codePointAt(0) ?? -1)
}

enum InputType {
  Unknown = 0,
  ASCII,
  UTF8,
  CEscape,
  Hexadecimal,
  Base64,
  Base64URL,
  QuotedPrintable,
}

const inputTypeNames: Record<InputType, string> = {
  [InputType.Unknown]: 'Unknown',
  [InputType.ASCII]: 'ASCII',
  [InputType.UTF8]: 'UTF-8',
  [InputType.CEscape]: 'C-like Escape Sequence',
  [InputType.Hexadecimal]: 'Hexadecimal',
  [InputType.Base64]: 'Base 64',
  [InputType.Base64URL]: 'Base 64 URL',
  [InputType.QuotedPrintable]: 'Quoted Printable',
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
  if (/\\([abefnrtv\\'"]|[0-7]{1,3}|x[a-fA-F0-9]{2}|u[a-fA-F0-9]{4}|U[a-fA-F0-9]{8})/.test(input)) {
    if (canConvert(() => escapeSequenceToBytes(input))) {
      return InputType.CEscape
    }
  }

  // oxlint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(input)) {
    return InputType.ASCII
  }
  return InputType.UTF8
}

function inputToBytes(input: string, inputType: InputType): Uint8Array {
  const val = input
  let output: Uint8Array
  try {
    if (inputType == InputType.CEscape) {
      output = escapeSequenceToBytes(val)
    } else if (inputType == InputType.Hexadecimal) {
      output = hexToBytes(val)
    } else if (inputType == InputType.Base64) {
      output = base64ToBytes(input)
    } else if (inputType == InputType.Base64URL) {
      output = base64ToBytes(input, true)
    } else if (inputType == InputType.QuotedPrintable) {
      output = qpToBytes(val)
    } else {
      output = new TextEncoder().encode(val)
    }
  } catch {
    console.warn('error decoding input, falling back to text')
    output = new TextEncoder().encode(val)
  }
  return output
}

export {
  ConversionError,
  escapeSequenceToBytes,
  hexToBytes,
  base64ToBytes,
  qpToBytes,
  InputType,
  friendlyInputType,
  autodetectInputType,
  inputToBytes,
}

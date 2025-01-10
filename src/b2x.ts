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

function hexToBytes(hex: string): number[] | undefined {
  if (hex.startsWith('\\x') || hex.startsWith('0x')) {
    hex = hex.slice(2)
  }
  if (!/^[a-fA-F0-9 \r\n\t]+$/.test(hex)) {
    return undefined
  }
  return hex
    .replace(/\s+/g, '') // Remove whitespace
    .match(/.{2}/g) // Split into pairs
    ?.map((byte) => parseInt(byte, 16))
}

function bytesToUTF8(bytes: number[] | Uint8Array): string {
  // ignoreBOM == false actually means... skip the BOM, not include it
  const decoder = new TextDecoder('utf-8', { ignoreBOM: false })
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

function autodetectInputType(input: string): InputType {
  if (input.startsWith('0x') || input.startsWith('\\x')) {
    return InputType.Hexadecimal
  } else if (/^[a-fA-F0-9 \r\n\t]+$/.test(input)) {
    // Hexadecimal input without '0x' prefix
    return InputType.Hexadecimal
  } else if (/^[A-Za-z0-9+/]+=?=?$/.test(input)) {
    // TODO: detect and report missing or invalid padding based on length
    return InputType.Base64
  } else if (/^[a-zA-Z0-9-_]+=?=?$/.test(input)) {
    // TODO: detect and report missing or invalid padding based on length
    return InputType.Base64URL
  } else if (/^[\x00-\x7F]*$/.test(input)) {
    return InputType.ASCII
  }
  return InputType.UTF8
}

enum DataType {
  Unknown = 0,
  Binary,
  ASCII,
  //ISO88591,
  //ISO885915,
  UTF8,
  //Windows1252,
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

export { debounce, hexToBytes, bytesToUTF8, InputType, autodetectInputType, DataType, autodetectDataType }

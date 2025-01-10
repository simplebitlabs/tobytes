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
  const prefix = '\\x'
  if (hex.startsWith(prefix)) {
    hex = hex.slice(prefix.length)
  }
  if (!/^[a-fA-F\d]+$/.test(hex)) {
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
  //ISO88591,
  UTF8,
  //Windows1252,
}

function autodetectType(input: string): InputType {
  if (input.startsWith('0x') || input.startsWith('\\x')) {
    return InputType.Hexadecimal
  } else if (/^[a-fA-F0-9]+$/.test(input)) {
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

export { debounce, hexToBytes, bytesToUTF8, InputType, autodetectType }

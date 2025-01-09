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
  console.log(decoder.encoding)
  return decoder.decode(new Uint8Array(bytes))
}

export { debounce, hexToBytes, bytesToUTF8 }

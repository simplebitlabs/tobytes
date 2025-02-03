const between = (b: number, lower: number, upper: number) => b >= lower && b <= upper
const continuation = (b: number) => b >= 0x80 && b <= 0xbf

function isValidUTF8(input: Uint8Array | number[]): boolean {
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

function doubleEncodedUTF8(input: Uint8Array | number[]): boolean {
  // https://stackoverflow.com/questions/11546351/what-character-encoding-is-c3-82-c2-bf
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

export { isValidUTF8, doubleEncodedUTF8 }

<template>
  <h3>Help and More Information</h3>
  <p>
    To Bytes takes your binary data and turn it into something more readable. Base 64, hexadecimal, ASCII, UTF-8,
    C-like escape sequences, and more are supported. Double Encoded UTF-8 and byte order marks are detected. As much as
    possible, To Bytes attempts to auto-detect your input so you don't have to fiddle around with manually specifying
    the format.
  </p>
  <p>
    Everything is decoded and detected <em>completely in your browser</em> - no input data is sent to a backend server
    at any time.
  </p>
  <h4>Supported Input Formats</h4>
  <h5>ASCII and UTF-8</h5>
  <p>
    Input such as <code>Hello World!</code> will be auto-detected as ASCII and left alone. Input such as
    <code>Hello! 👋</code> will be auto-detected as UTF-8 and left alone. Note that some plain text strings may look a
    lot like Base 64 or Hexadecimal - if you input a plain text string, you may need to turn autodetection off if it
    looks like an encoded format.
  </p>
  <h5>Base 64</h5>
  <p>
    An input of <code>SGVsbG8hIPCfkYsK</code> will be auto-detected as Base64 and automatically decoded. Line breaks
    and whitespace are ignored. The "Base 64 URL" scheme is also supported (and auto-detected), which replaces "+"
    (plus) and "/" (forward slash) with "-" (minus) and "_" (underline).
  </p>
  <h5>C-like Escape Sequences</h5>
  <p>
    A string like <code>\167\x68\u0079\U0000003F</code> will be detected as a C-like string using escape sequences, and
    decoded to "why?". A large variety of escape sequence types are supported:
  </p>
  <ul>
    <li>
      <code>\a</code> (alert/bell), <code>\b</code> (backspace), <code>\e</code> (escape), <code>\f</code> (form feed),
      <code>\n</code> (new line), <code>\r</code> (carriage return), <code>\t</code> (horizontal tab),
      <code>\v</code> (vertical tab), <code>\\</code> (backslash), <code>\'</code> (single quote),
      <code>\"</code> (double quote)
    </li>
    <li><code>\000</code> - octal 1-3 digit character escape</li>
    <li><code>\x00</code> - hex 2 digit escape character escapes</li>
    <li><code>\u0000</code>, <code>\U00000000</code> - unicode 4 or 8 digit character escapes</li>
  </ul>
  <h5>Hexadecimal (or Base 16)</h5>
  <p>
    Input using only the hex digits <code>48656c6c6f20776f726c64</code> will be auto-detected as Hexadecimal and
    automatically decoded. Line breaks and whitespace are ignored, and decoding is case-insensitive. Additional input
    formats are supported and automatically decoded:
  </p>
  <ul>
    <li><code>\x48656c6c6f20776f726c64</code> - Postgres BYTEA escape format</li>
    <li><code>0x48656c6c6f20776f726c64</code> - `0x` prefixed strings</li>
  </ul>
  <h4>Metadata and Output</h4>
  <p>
    To Bytes detects both invalid and double encoded UTF-8, and indicates if either were found. This detection takes
    place after any decoding (Base64, Hex, etc.) on the decoded raw bytes. The presence of a leading Byte Order Mark
    (BOM) is also detected and displayed.
  </p>
  <p>
    The raw output shows a hexdump-like view of the decoded input data, and can be configured to show control
    characters and printable characters if desired. Additionally, Unicode code points can be displayed rather than
    UTF-8 encoded raw bytes. Characters outside the Basic Multilingual Plane (BMP) are correctly handled.
  </p>
  <p>
    The text output pane attempts to display a textual representation of the decoded input data. If the data is binary,
    it may display unprintable characters. Additional metadata about the number of bytes, characters, and UTF-16 code
    points are also shown.
  </p>
  <p>
    Finally, there is a copy to clipboard button that allows you to copy the output to your clipboard in the format of
    your choosing. You can choose between plain text, Base64 encoded, or various Hexadecimal encoded formats. This is
    useful for debugging or sharing the decoded data with others.
  </p>
  <p>
    If To Bytes does not quite do what you need, you may want to try
    <a href="https://gchq.github.io/CyberChef/">CyberChef</a>, a "Swiss Army knife" program that supports hundreds of
    encode and decode operations and transforms.
  </p>
</template>

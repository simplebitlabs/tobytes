# To Bytes

To Bytes takes your binary data and turn it into something more readable. Base 64, hexadecimal, ASCII, UTF-8, C-like escape sequences, and more are supported. Double Encoded UTF-8 and byte order marks are detected.

## Development

### Recommended IDE Setup - VS Code

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

### Project Commands

These commands assume you have a working NodeJS and npm environment set up.

```sh
# installing necessary dependencies
npm install

# compile and enable hot-reload for development
npm run dev

#type-check, compile and minify for a production deployment
npm run build

# lint code, before commiting changes
npm run lint

# run tests
npm run test
```

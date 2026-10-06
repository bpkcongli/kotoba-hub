// Jest loads custom environments outside its TypeScript transformer.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TestEnvironment } = require('jest-environment-jsdom');

// jsdom does not supply fetch. Share Node's native web APIs before MSW loads,
// preserving matching Request/Response constructors without another polyfill.
class FetchJsdomEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    for (const name of [
      'fetch',
      'Headers',
      'Request',
      'Response',
      'TextEncoder',
      'TextDecoder',
      'ReadableStream',
      'WritableStream',
      'TransformStream',
      'BroadcastChannel',
    ]) {
      this.global[name] = globalThis[name];
    }
  }
}

module.exports = FetchJsdomEnvironment;

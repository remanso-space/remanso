import { config } from "@vue/test-utils"

config.global.stubs = {
  "router-link": true,
  "router-view": true,
  transition: false,
  "transition-group": false
}

// jsdom's Blob has no stream(); shiki's inlined oniguruma wasm decompresses
// itself through it.
if (typeof Blob.prototype.stream !== "function") {
  Blob.prototype.stream = function stream(this: Blob) {
    const blob = this
    return new ReadableStream<Uint8Array<ArrayBuffer>>({
      async start(controller) {
        controller.enqueue(new Uint8Array(await blob.arrayBuffer()))
        controller.close()
      }
    })
  }
}

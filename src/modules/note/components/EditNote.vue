<script setup lang="ts">
import { ref } from "vue"

defineProps<{
  modelValue: string
}>()

const emits = defineEmits<{
  (event: "update:modelValue", payload: string): void
  (event: "caret", payload: number | null): void
}>()

const editor = ref<HTMLPreElement | null>(null)

const handleInput = (input: string) => {
  const sanitizedInput = input.replace(/\n{3,}/g, "\n\n")
  emits("update:modelValue", sanitizedInput)
}

// Zero-width, so it never reflows the line while briefly in the DOM.
const MARKER = "﻿"

/**
 * Character offset of the caret, measured against `innerText`.
 *
 * Measured by dropping a zero-width marker at the caret and reading its index
 * back out of `innerText`, rather than with `Range.toString().length`: the
 * model is built from `innerText`, and the two disagree the moment the browser
 * represents a newline as a `<div>` or `<br>` instead of a literal "\n".
 * Programmatic DOM edits don't fire `input`, so this cannot corrupt the model.
 */
const caretOffset = (): number | null => {
  const element = editor.value
  const selection = window.getSelection()
  if (!element || !selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  if (!element.contains(range.startContainer)) return null

  const marker = document.createTextNode(MARKER)
  try {
    const probe = range.cloneRange()
    probe.collapse(true)
    probe.insertNode(marker)

    const index = element.innerText.indexOf(MARKER)
    return index >= 0 ? index : null
  } catch {
    return null
  } finally {
    marker.remove()
    element.normalize()
  }
}

// Captured on blur rather than on every selectionchange: blur fires before the
// toolbar button's click, and the file picker destroys the selection before any
// later hook could read it.
const handleBlur = () => emits("caret", caretOffset())
</script>

<template>
  <div>
    <pre
      ref="editor"
      v-once
      contenteditable
      @input="(e) => handleInput((e.target as any)?.innerText ?? '')"
      @blur="handleBlur"
      >{{ modelValue }}</pre
    >
  </div>
</template>

<style scoped lang="scss">
pre {
  width: 100%;
  height: 100%;
  border: none;
  flex: 1;
  resize: none;
  white-space: pre-wrap;
  text-align: left;
}
</style>

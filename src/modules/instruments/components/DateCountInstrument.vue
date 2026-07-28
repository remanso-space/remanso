<script setup lang="ts">
import { differenceInCalendarDays, isValid, parseISO } from "date-fns"

import type { InstrumentProps } from "../sibling"

const props = defineProps<InstrumentProps>()

const ARGS_RE = /^(\d{4}-\d{2}-\d{2})(?:\s+(.+))?$/

const match = ARGS_RE.exec(props.args.trim())
const isoDate = match?.[1] ?? ""
const parsed = isoDate ? parseISO(isoDate) : null
const valid = parsed !== null && isValid(parsed)
const label = valid ? (match?.[2] ?? "").trim() : ""

const today = new Date()
const diff =
  valid && parsed
    ? props.name === "since"
      ? differenceInCalendarDays(today, parsed)
      : differenceInCalendarDays(parsed, today)
    : 0

// Shown in the reader's locale and timezone (parseISO already parses the
// date-only string as local midnight, so the day count is local too).
const localeDate =
  valid && parsed
    ? parsed.toLocaleDateString(undefined, { dateStyle: "long" })
    : ""

const formatCount = (count: number): string =>
  String(count).replace(/\B(?=(\d{3})+(?!\d))/g, " ")

const unit = (count: number): string => (count === 1 ? "day" : "days")

const display =
  diff === 0
    ? "today"
    : diff < 0
      ? props.name === "since"
        ? `in ${formatCount(-diff)} ${unit(-diff)}`
        : `${formatCount(-diff)} ${unit(-diff)} ago`
      : `${formatCount(diff)} ${unit(diff)}`
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-fit rounded-box border border-base-300 bg-base-100 p-3"
  >
    <template v-if="valid">
      <div
        class="font-mono text-2xl tabular-nums"
        :class="diff < 0 ? 'opacity-60' : 'text-(--link-accent)'"
      >
        {{ display }}
      </div>
      <div class="text-sm opacity-60">
        <template v-if="label">{{ label }} · </template>{{ localeDate }}
      </div>
    </template>
    <div v-else class="text-sm opacity-60">
      {{ props.args }}
      <span class="block">expected :::{{ props.name }} YYYY-MM-DD:::</span>
    </div>
  </div>
</template>

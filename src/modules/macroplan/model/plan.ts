import type {
  FeatureRow,
  Marker,
  MilestoneLine,
  Plan,
  RawFeature,
  RawPlan
} from "./types"
import { mondayOf, type WeekId, weekRange } from "./week"

/**
 * Derive the render-ready Plan from the raw model (component C2).
 *
 * On-time vs. late is judged ONLY against the Original Estimate, never a
 * Re-estimate (ADR-0001). The full slip history (`◯` + every `△`) is preserved.
 */
export function buildPlan(
  raw: RawPlan,
  today: Date | string = new Date()
): Plan {
  const nowWeek = mondayOf(today)
  const rows = raw.features.map((f) => buildRow(f, nowWeek))

  const milestones = raw.milestones.map((m): MilestoneLine => {
    const week = mondayOf(m.week)
    const unmet = m.requires.filter((name) => {
      const row = rows.find((r) => r.name === name)
      if (!row) return true // references an unknown Feature → can't be met
      const delivery = row.markers.find(
        (x) => x.kind === "delivered-on-time" || x.kind === "delivered-late"
      )
      return !delivery || delivery.week > week // undelivered, or delivered after the milestone
    })
    return { name: m.name, week, requires: m.requires, unmet }
  })

  // Range: earliest start to last marker/milestone (CONTEXT.md). Empty weeks drawn.
  // Optional authored `start`/`end` widen this span with lead-in / trailing weeks;
  // they only ever extend it — a Feature or marker outside them is never clipped.
  const allWeeks: WeekId[] = []
  if (raw.start != null) allWeeks.push(mondayOf(raw.start))
  if (raw.end != null) allWeeks.push(mondayOf(raw.end))
  for (const r of rows) {
    allWeeks.push(r.startWeek, r.barEndWeek)
    for (const mk of r.markers) allWeeks.push(mk.week)
  }
  for (const m of milestones) allWeeks.push(m.week)

  let weeks: WeekId[] = []
  if (allWeeks.length) {
    const start = allWeeks.reduce((a, b) => (a < b ? a : b))
    const end = allWeeks.reduce((a, b) => (a > b ? a : b))
    weeks = weekRange(start, end)
  }
  const nowInRange =
    weeks.length > 0 &&
    nowWeek >= weeks[0] &&
    nowWeek <= weeks[weeks.length - 1]

  return { title: raw.title, weeks, rows, milestones, nowWeek, nowInRange }
}

function buildRow(f: RawFeature, nowWeek: WeekId): FeatureRow {
  const startWeek = mondayOf(f.start)
  const originalWeek = mondayOf(f.original)
  const deliveredWeek = f.delivered ? mondayOf(f.delivered) : undefined
  const delivered = deliveredWeek != null
  // ADR-0001: compare the Delivery week to the Original Estimate week only.
  const onTime = delivered ? deliveredWeek! <= originalWeek : null

  const markers: Marker[] = []
  for (const re of f.reestimates)
    markers.push({ week: mondayOf(re), kind: "reestimate" })
  if (delivered) {
    markers.push({
      week: deliveredWeek!,
      kind: onTime ? "delivered-on-time" : "delivered-late"
    })
  }
  // The Original Estimate `◯` stands unless an on-time/early delivery already
  // occupies (or precedes) it — then the delivery marker speaks for it.
  if (!(delivered && onTime)) {
    markers.push({ week: originalWeek, kind: "original" })
  }

  const intrinsicEnd = [startWeek, ...markers.map((m) => m.week)].reduce(
    (a, b) => (a > b ? a : b)
  )
  // A delivered Feature's bar ends at its delivery. An undelivered Feature that
  // is already past its furthest estimate keeps "running" up to now (overdue),
  // so its bar extends to the now week; otherwise it ends at the last marker.
  const barEndWeek =
    delivered || intrinsicEnd > nowWeek ? intrinsicEnd : nowWeek

  return {
    name: f.name,
    startWeek,
    barEndWeek,
    markers,
    delivered,
    onTime,
    status: f.status,
    note: f.note,
    learning: f.learning,
    slipCount: f.reestimates.length
  }
}

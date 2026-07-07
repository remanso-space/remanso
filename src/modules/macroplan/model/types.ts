import type { WeekId } from "./week"

export type StatusLevel = "on-track" | "at-risk" | "off-track"

// ── Raw model: as authored, after TOML parse + validation, before derivation ──

export interface RawFeature {
  name: string
  start: string // yyyy-mm-dd
  original: string // yyyy-mm-dd — the Original Estimate
  reestimates: string[] // yyyy-mm-dd[]
  delivered?: string // yyyy-mm-dd
  learning?: string
  status?: StatusLevel
  note?: string
}

export interface RawMilestone {
  name: string
  week: string // yyyy-mm-dd
  requires: string[] // Feature names
}

export interface RawPlan {
  title: string
  start?: string // yyyy-mm-dd — optional authored left edge of the plan's span
  end?: string // yyyy-mm-dd — optional authored right edge of the plan's span
  features: RawFeature[]
  milestones: RawMilestone[]
}

// ── Derived model: render-ready (C2 output) ──

export type MarkerKind =
  | "original" // ◯ Original Estimate, not yet delivered
  | "reestimate" // △ a slip to a later week
  | "delivered-on-time" // ◉ delivered on/before the Original Estimate
  | "delivered-late" // ▲ delivered after the Original Estimate

export interface Marker {
  week: WeekId
  kind: MarkerKind
}

export interface FeatureRow {
  name: string
  startWeek: WeekId
  barEndWeek: WeekId
  markers: Marker[]
  delivered: boolean
  onTime: boolean | null // null while in-flight
  status?: StatusLevel
  note?: string
  learning?: string
  slipCount: number // number of Re-estimates
}

export interface MilestoneLine {
  name: string
  week: WeekId
  requires: string[]
  unmet: string[] // required Features not delivered on/before this week
}

export interface Plan {
  title: string
  weeks: WeekId[]
  rows: FeatureRow[]
  milestones: MilestoneLine[]
  nowWeek: WeekId
  nowInRange: boolean
}

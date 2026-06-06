import { describe, expect, it } from "vitest"

import { fromShortDid, toShortDid } from "./shortDid"

describe("toShortDid", () => {
  it("strips did:plc: prefix", () => {
    expect(toShortDid("did:plc:abc123")).toBe("abc123")
  })

  it("strips did: prefix but keeps the method when non-plc", () => {
    expect(toShortDid("did:web:example.com")).toBe("web:example.com")
  })

  it("returns input unchanged when there is no did: prefix", () => {
    expect(toShortDid("abc123")).toBe("abc123")
  })
})

describe("fromShortDid", () => {
  it("adds did:plc: prefix to bare identifiers", () => {
    expect(fromShortDid("abc123")).toBe("did:plc:abc123")
  })

  it("adds did: prefix when method is already present", () => {
    expect(fromShortDid("web:example.com")).toBe("did:web:example.com")
  })

  it("passes through fully-qualified DIDs unchanged", () => {
    expect(fromShortDid("did:plc:abc123")).toBe("did:plc:abc123")
    expect(fromShortDid("did:web:example.com")).toBe("did:web:example.com")
  })
})

describe("round-trip toShortDid → fromShortDid", () => {
  it.each(["did:plc:abc123", "did:web:example.com", "did:key:zXyZ"])(
    "is identity for %s",
    (did) => {
      expect(fromShortDid(toShortDid(did))).toBe(did)
    }
  )
})

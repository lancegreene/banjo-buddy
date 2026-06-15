import { describe, it, expect } from 'vitest'
import { buildLibraryCatalog } from '../../src/engine/itemCatalog'

describe('buildLibraryCatalog', () => {
  it('produces non-empty catalog from library data', () => {
    const catalog = buildLibraryCatalog()
    expect(catalog.length).toBeGreaterThan(0)
  })

  it('each entry has id, kind, name, conceptTags, brief', () => {
    const catalog = buildLibraryCatalog()
    for (const item of catalog) {
      expect(typeof item.id).toBe('string')
      expect(item.id.length).toBeGreaterThan(0)
      expect(typeof item.kind).toBe('string')
      expect(typeof item.name).toBe('string')
      expect(item.name.length).toBeGreaterThan(0)
      expect(Array.isArray(item.conceptTags)).toBe(true)
      expect(typeof item.brief).toBe('string')
      expect(item.brief.length).toBeGreaterThan(0)
    }
  })

  it('includes items from all 5 kinds', () => {
    const catalog = buildLibraryCatalog()
    const kinds = new Set(catalog.map(c => c.kind))
    expect(kinds.has('lick')).toBe(true)
    expect(kinds.has('roll')).toBe(true)
    expect(kinds.has('song-section')).toBe(true)
    expect(kinds.has('chord')).toBe(true)
    expect(kinds.has('scale')).toBe(true)
  })

  it('produces stable ids unique per (kind, id) pair', () => {
    const catalog = buildLibraryCatalog()
    const seen = new Set<string>()
    for (const item of catalog) {
      const key = `${item.kind}:${item.id}`
      expect(seen.has(key), `duplicate ${key}`).toBe(false)
      seen.add(key)
    }
  })
})

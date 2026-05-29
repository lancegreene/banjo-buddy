// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Library catalog builder
// Pure: assembles all library items into LibraryCatalogItem[] for LLM context.
// No React, no side effects. Reads static library data only.
// ─────────────────────────────────────────────────────────────────────────────

import type { LibraryCatalogItem } from '../types/coach'
import { LICK_LIBRARY } from '../data/lickLibrary'
import { ROLL_PATTERNS } from '../data/rollPatterns'
import { SONGS } from '../data/songLibrary'
import { CHORD_DIAGRAMS } from '../data/chordDiagrams'
import { SCALE_LIBRARY } from '../data/scaleLibrary'

/**
 * Build the flat catalog of every library item the coach LLM can reference.
 *
 * Field mapping per kind (actual data shapes — adapted from spec):
 *   lick         → LickReference  { id, name, description, key, role, tags }
 *   roll         → RollPattern    { id, name, description, tags }            (no key)
 *   song-section → SongSection    { id, name, tags } (nested under Song.sections)
 *                  id becomes "${song.id}/${section.id}" to match ItemRef shape
 *                  name becomes "${song.name} — ${section.name}"
 *                  key inherited from song.key
 *                  brief synthesized (SongSection has no description)
 *   chord        → ChordDiagram   { id, name, root, tags }   (root → key, name → brief)
 *   scale        → ScalePattern   { id, name, description, key, tags }
 */
export function buildLibraryCatalog(): LibraryCatalogItem[] {
  const items: LibraryCatalogItem[] = []

  for (const lick of LICK_LIBRARY) {
    items.push({
      id: lick.id,
      kind: 'lick',
      name: lick.name,
      key: lick.key,
      role: lick.role,
      conceptTags: lick.tags ?? [],
      brief: lick.description ?? `${lick.role} lick in ${lick.key}`,
    })
  }

  for (const roll of ROLL_PATTERNS) {
    items.push({
      id: roll.id,
      kind: 'roll',
      name: roll.name,
      conceptTags: roll.tags ?? [],
      brief: roll.description ?? roll.name,
    })
  }

  for (const song of SONGS) {
    for (const section of song.sections ?? []) {
      items.push({
        // Composite id mirrors ItemRef shape: { songId, sectionId } → "songId/sectionId"
        id: `${song.id}/${section.id}`,
        kind: 'song-section',
        name: `${song.name} — ${section.name}`,
        key: song.key,
        conceptTags: section.tags ?? [],
        // SongSection has no description field; synthesize a brief.
        brief: `${section.name} of ${song.name}`,
      })
    }
  }

  for (const chord of CHORD_DIAGRAMS) {
    items.push({
      id: chord.id,
      kind: 'chord',
      name: chord.name,
      key: chord.root,
      conceptTags: chord.tags ?? [],
      // ChordDiagram has no description; include position when available.
      brief: chord.position ? `${chord.name} (${chord.position})` : chord.name,
    })
  }

  for (const scale of SCALE_LIBRARY) {
    items.push({
      id: scale.id,
      kind: 'scale',
      name: scale.name,
      key: scale.key,
      conceptTags: scale.tags ?? [],
      brief: scale.description ?? scale.name,
    })
  }

  return items
}

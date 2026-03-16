// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Song Library
// Full tablature data for multi-section songs. Each measure has 8 eighth notes.
// Cripple Creek is the standard Scruggs beginner arrangement in open G tuning.
// ─────────────────────────────────────────────────────────────────────────────

import type { TabNote } from '../engine/banjoSynth'
export type { TabNote }

export interface Measure {
  chord: string            // 'G', 'C', 'D7'
  notes: TabNote[]         // 8 eighth notes per measure
}

export interface SongSection {
  id: string               // 'cripple_creek_a'
  name: string             // 'A Part'
  measures: Measure[]
}

export interface Song {
  id: string
  name: string
  key: string
  defaultBpm: number       // learning tempo
  performanceBpm: number   // target performance tempo
  sections: SongSection[]
  structure: string[]      // section IDs in play order, e.g. ['a','a','b','b']
}

// ── Cripple Creek — Standard Scruggs Beginner Arrangement ─────────────────
// Source: Earl Scruggs and the 5-String Banjo, Ch. 9 (Tracks 12, 18, 27)
// Uses alternating thumb pattern (T-I-M-T) with slides and hammer-ons.
// The signature sound is the slide on string 3 from fret 2 to fret 4.

// A Part (Chorus): 4 measures of G with slide melody + D turnaround + G ending
// This is the Scruggs simplified chorus (Track 12) with hammer-ons (Track 18)

const CRIPPLE_CREEK_A: SongSection = {
  id: 'cripple_creek_a',
  name: 'A Part',
  measures: [
    // Measure 1: G — slide on string 3 (2→4) with alternating thumb
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },  // slide 2→4
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B open
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D open
        { string: 4, fret: 0, beat: 3, finger: 'T' },   // D3 open
        { string: 3, fret: 2, beat: 4, finger: 'T', technique: 'slide', slideToFret: 4 },  // slide 2→4
        { string: 2, fret: 0, beat: 5, finger: 'I' },   // B open
        { string: 1, fret: 0, beat: 6, finger: 'M' },   // D open
        { string: 4, fret: 0, beat: 7, finger: 'T' },   // D3 open
      ],
    },
    // Measure 2: G — same slide pattern
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 4, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 2, beat: 4, finger: 'T', technique: 'slide', slideToFret: 4 },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 4, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // Measure 3: G — same slide, with string 5 drone on beat 4
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 4, fret: 0, beat: 3, finger: 'T' },
        { string: 5, fret: 0, beat: 4, finger: 'T' },   // G drone
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 4, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // Measure 4: D turnaround → G resolution
    {
      chord: 'D',
      notes: [
        { string: 1, fret: 0, beat: 0, finger: 'M' },   // D4
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D4
        { string: 4, fret: 0, beat: 3, finger: 'T' },   // D3
        { string: 1, fret: 0, beat: 4, finger: 'M' },   // D4
        { string: 2, fret: 0, beat: 5, finger: 'I' },   // B
        { string: 4, fret: 2, beat: 6, finger: 'T' },   // E (D chord tone)
        { string: 1, fret: 0, beat: 7, finger: 'M' },   // D4
      ],
    },
  ],
}

// B Part (Verse): G with hammer-on melody, C chord, back to G, D turnaround
// Source: Scruggs Track 18 — Cripple Creek with hammer-ons

const CRIPPLE_CREEK_B: SongSection = {
  id: 'cripple_creek_b',
  name: 'B Part',
  measures: [
    // Measure 1: G — hammer-on on string 3 (0→2) with alternating thumb
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer' },  // G→A (hammer 0→2)
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D
        { string: 4, fret: 0, beat: 3, finger: 'T' },   // D3
        { string: 5, fret: 0, beat: 4, finger: 'T' },   // G drone
        { string: 2, fret: 0, beat: 5, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 6, finger: 'M' },   // D
        { string: 4, fret: 0, beat: 7, finger: 'T' },   // D3
      ],
    },
    // Measure 2: C — hammer-on on string 2 (0→1) for C chord
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 2, beat: 0, finger: 'T' },              // E (C chord bass)
        { string: 2, fret: 0, beat: 1, finger: 'I' },              // B (about to hammer)
        { string: 2, fret: 1, beat: 2, finger: 'I', technique: 'hammer' }, // C (hammered)
        { string: 5, fret: 0, beat: 3, finger: 'T' },              // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T' },              // G
        { string: 2, fret: 1, beat: 5, finger: 'I' },              // C
        { string: 1, fret: 0, beat: 6, finger: 'M' },              // D
        { string: 5, fret: 0, beat: 7, finger: 'T' },              // G drone
      ],
    },
    // Measure 3: G — resolution with slide
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 4, fret: 0, beat: 3, finger: 'T' },
        { string: 5, fret: 0, beat: 4, finger: 'T' },   // G drone
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 4, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // Measure 4: D turnaround → G
    {
      chord: 'D',
      notes: [
        { string: 1, fret: 0, beat: 0, finger: 'M' },   // D4
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D4
        { string: 4, fret: 0, beat: 3, finger: 'T' },   // D3
        { string: 1, fret: 0, beat: 4, finger: 'M' },   // D4
        { string: 2, fret: 0, beat: 5, finger: 'I' },   // B
        { string: 4, fret: 2, beat: 6, finger: 'T' },   // E (D chord tone)
        { string: 1, fret: 0, beat: 7, finger: 'M' },   // D4
      ],
    },
  ],
}

// ── Cripple Creek (Earl Scruggs) — Foggy Mountain Banjo / Scruggs Book ──────
// The definitive Scruggs arrangement: hammer-on 0→2 on string 3, alternating
// thumb pattern (T-I-T-M), B part melody on string 1 fret 2.
// Chord changes: A part = G-G-G-D, B part = G-C-G-D. Structure: AABB.
// Target tempo ~120 BPM (Scruggs plays it faster, but 120 is a solid goal).

// A Part: The signature instrumental break. Hammer-on 0→2 on string 3 drives
// the melody while thumb alternates between bass strings 3/4/5.

const CRIPPLE_CREEK_SCRUGGS_A: SongSection = {
  id: 'cripple_creek_scruggs_a',
  name: 'A Part',
  measures: [
    // Measure 1: G — signature hammer-on lick, alternating thumb
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer' },  // h0→2 (G→A)
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B open
        { string: 5, fret: 0, beat: 2, finger: 'T' },   // G4 drone
        { string: 1, fret: 0, beat: 3, finger: 'M' },   // D4 open
        { string: 3, fret: 0, beat: 4, finger: 'T', technique: 'hammer' },  // h0→2
        { string: 2, fret: 0, beat: 5, finger: 'I' },   // B
        { string: 5, fret: 0, beat: 6, finger: 'T' },   // G4 drone
        { string: 1, fret: 0, beat: 7, finger: 'M' },   // D4
      ],
    },
    // Measure 2: G — same signature lick
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 5, fret: 0, beat: 2, finger: 'T' },
        { string: 1, fret: 0, beat: 3, finger: 'M' },
        { string: 3, fret: 0, beat: 4, finger: 'T', technique: 'hammer' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 5, fret: 0, beat: 6, finger: 'T' },
        { string: 1, fret: 0, beat: 7, finger: 'M' },
      ],
    },
    // Measure 3: G — hammer first half, open second half (setup turnaround)
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 5, fret: 0, beat: 2, finger: 'T' },
        { string: 1, fret: 0, beat: 3, finger: 'M' },
        { string: 5, fret: 0, beat: 4, finger: 'T' },   // drone leads into turnaround
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // Measure 4: D → G turnaround
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },   // D3 bass
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },   // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T', technique: 'hammer' },  // resolve to G: h0→2
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 5, fret: 0, beat: 6, finger: 'T' },
        { string: 1, fret: 0, beat: 7, finger: 'M' },
      ],
    },
  ],
}

// B Part: Verse melody ("Going up Cripple Creek, going on the run").
// Melody carried on string 1 fret 2 (E note) over forward roll patterns.
// C chord in measure 2 with fretted bass (string 4 fret 2) and string 2 fret 1.

const CRIPPLE_CREEK_SCRUGGS_B: SongSection = {
  id: 'cripple_creek_scruggs_b',
  name: 'B Part',
  measures: [
    // Measure 1: G — "Going up" — melody E on string 1 fret 2
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },   // G
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B
        { string: 1, fret: 2, beat: 2, finger: 'M' },   // E (melody)
        { string: 5, fret: 0, beat: 3, finger: 'T' },   // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T' },   // G
        { string: 2, fret: 0, beat: 5, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 6, finger: 'M' },   // D
        { string: 5, fret: 0, beat: 7, finger: 'T' },   // G drone
      ],
    },
    // Measure 2: C — "Cripple Creek" — C chord shape
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 2, beat: 0, finger: 'T' },   // E (C bass)
        { string: 2, fret: 1, beat: 1, finger: 'I' },   // C
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D
        { string: 5, fret: 0, beat: 3, finger: 'T' },   // G drone
        { string: 4, fret: 2, beat: 4, finger: 'T' },   // E
        { string: 2, fret: 1, beat: 5, finger: 'I' },   // C
        { string: 1, fret: 0, beat: 6, finger: 'M' },   // D
        { string: 5, fret: 0, beat: 7, finger: 'T' },   // G drone
      ],
    },
    // Measure 3: G — "going on the" — back to signature hammer lick
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer' },  // h0→2
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 5, fret: 0, beat: 2, finger: 'T' },
        { string: 1, fret: 0, beat: 3, finger: 'M' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },   // open G
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 5, fret: 0, beat: 6, finger: 'T' },
        { string: 1, fret: 0, beat: 7, finger: 'M' },
      ],
    },
    // Measure 4: D → G — "run" — turnaround
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },   // D3 bass
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },   // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T', technique: 'hammer' },  // resolve to G
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 5, fret: 0, beat: 6, finger: 'T' },
        { string: 1, fret: 0, beat: 7, finger: 'M' },
      ],
    },
  ],
}

// ── Worried Man Blues — Janet Davis, Splitting the Licks ─────────────────────
// 16-bar verse in G. Chord progression: G(8) | C(2) | D(2) | G(4)
// Forward roll arrangement (Cycle 2) with melody on accented beats.

const WORRIED_MAN_VERSE: SongSection = {
  id: 'worried_man_verse',
  name: 'Verse',
  measures: [
    // m1: G — "It takes a worried man"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m2: G — "to sing a worried song"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m3: G
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m4: G
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m5: G
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m6: G
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m7: G
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m8: G
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m9: G — "I'm worried"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m10: G
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m11: C — "now"
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 2, beat: 0, finger: 'T' },   // E (C bass)
        { string: 2, fret: 1, beat: 1, finger: 'I' },   // C
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D
        { string: 5, fret: 0, beat: 3, finger: 'T' },   // G drone
        { string: 4, fret: 2, beat: 4, finger: 'T' },   // E
        { string: 2, fret: 1, beat: 5, finger: 'I' },   // C
        { string: 1, fret: 0, beat: 6, finger: 'M' },   // D
        { string: 5, fret: 0, beat: 7, finger: 'T' },   // G drone
      ],
    },
    // m12: C
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 2, beat: 0, finger: 'T' },
        { string: 2, fret: 1, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 2, beat: 4, finger: 'T' },
        { string: 2, fret: 1, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m13: D — "but I won't be"
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },   // D3
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },   // G drone
        { string: 4, fret: 0, beat: 4, finger: 'T' },   // D3
        { string: 2, fret: 0, beat: 5, finger: 'I' },   // B
        { string: 1, fret: 0, beat: 6, finger: 'M' },   // D4
        { string: 5, fret: 0, beat: 7, finger: 'T' },   // G drone
      ],
    },
    // m14: D — "worried long"
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m15: G — resolution
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m16: G — ending
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
  ],
}

// ── Roll In My Sweet Baby's Arms — Janet Davis, Splitting the Licks ─────────
// 16-bar chorus in G. Chord progression: G(6) | D(2) | G(2) | C(2) | D(2) | G(2)

const ROLL_IN_SWEET_BABYS_ARMS_CHORUS: SongSection = {
  id: 'roll_sweet_babys_chorus',
  name: 'Chorus',
  measures: [
    // m1-4: G — "Roll in my sweet baby's arms"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m5-6: G — "Roll in my sweet baby's arms"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m7: D — chord change
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m8: D
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m9-10: G — "Gonna lay 'round this shack"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m11-12: C — "till the mail train comes back"
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 2, beat: 0, finger: 'T' },
        { string: 2, fret: 1, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 2, beat: 4, finger: 'T' },
        { string: 2, fret: 1, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 2, beat: 0, finger: 'T' },
        { string: 2, fret: 1, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 2, beat: 4, finger: 'T' },
        { string: 2, fret: 1, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m13-14: D — "and roll in my sweet"
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m15-16: G — "baby's arms"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
  ],
}

// ── Goin' Down That Road Feelin' Bad — Janet Davis, Splitting the Licks ─────
// 16-bar verse in G. Chord progression: G(4) | C(2) | G(4) | G(2) | D(2) | G(2)

const GOIN_DOWN_ROAD_VERSE: SongSection = {
  id: 'goin_down_road_verse',
  name: 'Verse',
  measures: [
    // m1-4: G — "I'm goin' down that road feelin' bad"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m5-6: C — "Goin' down that road feelin' bad"
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 2, beat: 0, finger: 'T' },
        { string: 2, fret: 1, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 2, beat: 4, finger: 'T' },
        { string: 2, fret: 1, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 2, beat: 0, finger: 'T' },
        { string: 2, fret: 1, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 2, beat: 4, finger: 'T' },
        { string: 2, fret: 1, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m7-8: G
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m9-12: G — "Goin' down that road feelin' bad bad bad"
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m13-14: D — "Lord, Lord, And I ain't gonna be treated this a way"
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'D',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 4, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // m15-16: G — resolution
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 1, fret: 0, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 3, fret: 0, beat: 4, finger: 'T' },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
  ],
}

// ── Song Definitions ──────────────────────────────────────────────────────────

export const SONGS: Song[] = [
  {
    id: 'cripple_creek',
    name: 'Cripple Creek',
    key: 'G',
    defaultBpm: 70,
    performanceBpm: 100,
    sections: [CRIPPLE_CREEK_A, CRIPPLE_CREEK_B],
    structure: ['cripple_creek_a', 'cripple_creek_a', 'cripple_creek_b', 'cripple_creek_b'],
  },
  {
    id: 'cripple_creek_scruggs',
    name: 'Cripple Creek (Earl Scruggs)',
    key: 'G',
    defaultBpm: 80,
    performanceBpm: 120,
    sections: [CRIPPLE_CREEK_SCRUGGS_A, CRIPPLE_CREEK_SCRUGGS_B],
    structure: ['cripple_creek_scruggs_a', 'cripple_creek_scruggs_a', 'cripple_creek_scruggs_b', 'cripple_creek_scruggs_b'],
  },
  {
    id: 'worried_man_blues',
    name: 'Worried Man Blues',
    key: 'G',
    defaultBpm: 60,
    performanceBpm: 90,
    sections: [WORRIED_MAN_VERSE],
    structure: ['worried_man_verse', 'worried_man_verse'],
  },
  {
    id: 'roll_sweet_babys_arms',
    name: "Roll In My Sweet Baby's Arms",
    key: 'G',
    defaultBpm: 60,
    performanceBpm: 95,
    sections: [ROLL_IN_SWEET_BABYS_ARMS_CHORUS],
    structure: ['roll_sweet_babys_chorus', 'roll_sweet_babys_chorus'],
  },
  {
    id: 'goin_down_road',
    name: "Goin' Down That Road Feelin' Bad",
    key: 'G',
    defaultBpm: 60,
    performanceBpm: 90,
    sections: [GOIN_DOWN_ROAD_VERSE],
    structure: ['goin_down_road_verse', 'goin_down_road_verse'],
  },
]

export const SONG_MAP = new Map(SONGS.map((s) => [s.id, s]))
export const SECTION_MAP = new Map(
  SONGS.flatMap((s) => s.sections.map((sec) => [sec.id, sec]))
)

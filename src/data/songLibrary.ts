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
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },  // G→A (hammer 0→2)
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
        { string: 2, fret: 0, beat: 1, finger: 'I', technique: 'hammer', slideToFret: 1 }, // B→C (hammer 0→1)
        { string: 2, fret: 1, beat: 2, finger: 'I' },              // C (hammered arrival)
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
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },  // h0→2 (G→A)
        { string: 2, fret: 0, beat: 1, finger: 'I' },   // B open
        { string: 5, fret: 0, beat: 2, finger: 'T' },   // G4 drone
        { string: 1, fret: 0, beat: 3, finger: 'M' },   // D4 open
        { string: 3, fret: 0, beat: 4, finger: 'T', technique: 'hammer', slideToFret: 2 },  // h0→2
        { string: 2, fret: 0, beat: 5, finger: 'I' },   // B
        { string: 5, fret: 0, beat: 6, finger: 'T' },   // G4 drone
        { string: 1, fret: 0, beat: 7, finger: 'M' },   // D4
      ],
    },
    // Measure 2: G — same signature lick
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 5, fret: 0, beat: 2, finger: 'T' },
        { string: 1, fret: 0, beat: 3, finger: 'M' },
        { string: 3, fret: 0, beat: 4, finger: 'T', technique: 'hammer', slideToFret: 2 },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 5, fret: 0, beat: 6, finger: 'T' },
        { string: 1, fret: 0, beat: 7, finger: 'M' },
      ],
    },
    // Measure 3: G — hammer first half, open second half (setup turnaround)
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },
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
        { string: 3, fret: 0, beat: 4, finger: 'T', technique: 'hammer', slideToFret: 2 },  // resolve to G: h0→2
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
        { string: 3, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },  // h0→2
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
        { string: 3, fret: 0, beat: 4, finger: 'T', technique: 'hammer', slideToFret: 2 },  // resolve to G
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

// ── Cripple Creek — Steffens Arrangement (A Part) ───────────────────────────
// Source: Joerg Steffens tab — melodic arrangement with S1 melody slides (2S5),
// S3 slides (2S4), and S4 hammer-ons (0H2). A part = 8 measures (4 + varied repeat).

const CRIPPLE_CREEK_STEFFENS_A: SongSection = {
  id: 'cripple_creek_steffens_a',
  name: 'A Part (Steffens)',
  measures: [
    // ── m1: G — String 1 melody with 2S5 slide ──
    {
      chord: 'G',
      notes: [
        { string: 1, fret: 2, beat: 0, finger: 'M', technique: 'slide', slideToFret: 5 },  // 2S5 (E→G)
        { string: 5, fret: 0, beat: 0, finger: 'T' },   // G drone (pinch with S1)
        { string: 1, fret: 5, beat: 2, finger: 'M' },    // G4
        { string: 5, fret: 0, beat: 2, finger: 'T' },    // G drone (pinch with S1)
        { string: 1, fret: 0, beat: 4, finger: 'M' },    // D4
        { string: 5, fret: 0, beat: 5, finger: 'T' },    // G drone
        { string: 2, fret: 0, beat: 6, finger: 'I' },    // B3
        { string: 5, fret: 0, beat: 7, finger: 'T' },    // G drone
      ],
    },
    // ── m2: C → G — C chord with string 2 fret 1 ──
    {
      chord: 'C',
      notes: [
        { string: 5, fret: 0, beat: 0, finger: 'T' },    // G drone
        { string: 2, fret: 1, beat: 1, finger: 'I' },     // C4 (C chord)
        { string: 1, fret: 2, beat: 2, finger: 'M' },     // E4
        { string: 5, fret: 0, beat: 3, finger: 'T' },     // G drone
        { string: 1, fret: 0, beat: 4, finger: 'M' },     // D4 (G resolution)
        { string: 5, fret: 0, beat: 5, finger: 'T' },     // G drone
        { string: 1, fret: 0, beat: 6, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 6, finger: 'T' },     // G drone (pinch with S1)
      ],
    },
    // ── m3: G — Slide on string 3 (2S4) with alternating bass ──
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },  // 2S4 (A→B)
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 2, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },     // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T' },     // G3
        { string: 1, fret: 0, beat: 5, finger: 'M' },     // D4
        { string: 4, fret: 2, beat: 6, finger: 'T' },     // E3
        { string: 3, fret: 0, beat: 7, finger: 'T' },     // G3
      ],
    },
    // ── m4: D7 → G — Hammer-on on string 4 (0H2), G resolution ──
    {
      chord: 'D7',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },  // 0H2 (D→E)
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 2, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },     // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T' },     // G3 (resolution)
        { string: 2, fret: 0, beat: 5, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 6, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 7, finger: 'T' },     // G drone
      ],
    },
    // ── m5: G — Repeat of m1 (2S5 melody) ──
    {
      chord: 'G',
      notes: [
        { string: 1, fret: 2, beat: 0, finger: 'M', technique: 'slide', slideToFret: 5 },
        { string: 5, fret: 0, beat: 0, finger: 'T' },  // pinch with S1
        { string: 1, fret: 5, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 2, finger: 'T' },  // pinch with S1
        { string: 1, fret: 0, beat: 4, finger: 'M' },
        { string: 5, fret: 0, beat: 5, finger: 'T' },
        { string: 2, fret: 0, beat: 6, finger: 'I' },
        { string: 5, fret: 0, beat: 7, finger: 'T' },
      ],
    },
    // ── m6: C → G — Repeat of m2 ──
    {
      chord: 'C',
      notes: [
        { string: 5, fret: 0, beat: 0, finger: 'T' },
        { string: 2, fret: 1, beat: 1, finger: 'I' },
        { string: 1, fret: 2, beat: 2, finger: 'M' },
        { string: 5, fret: 0, beat: 3, finger: 'T' },
        { string: 1, fret: 0, beat: 4, finger: 'M' },
        { string: 5, fret: 0, beat: 5, finger: 'T' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 6, finger: 'T' },  // pinch with S1
      ],
    },
    // ── m7: G — Varied repeat of m3 (more S1/S2 fills, no S3 after slide) ──
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },  // 2S4
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 2, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },     // G drone
        { string: 1, fret: 0, beat: 4, finger: 'M' },     // D4
        { string: 2, fret: 0, beat: 5, finger: 'I' },     // B3
        { string: 4, fret: 2, beat: 6, finger: 'T' },     // E3
        { string: 5, fret: 0, beat: 7, finger: 'T' },     // G drone
      ],
    },
    // ── m8: D7 → G — Ending with hammer-on, resolves to G ──
    {
      chord: 'D7',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },  // 0H2
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 2, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },     // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T' },     // G3
        { string: 1, fret: 0, beat: 6, finger: 'M' },     // D4 (pinch with S5)
        { string: 5, fret: 0, beat: 6, finger: 'T' },     // G drone (pinch with S1)
        { string: 5, fret: 0, beat: 7, finger: 'T' },     // G drone (ending)
      ],
    },
  ],
}

// ── Cripple Creek — Steffens Arrangement (B Part / Verse) ───────────────────
// Features the distinctive 3P2 pull-off on string 3 and 2S4 slides throughout.

const CRIPPLE_CREEK_STEFFENS_B: SongSection = {
  id: 'cripple_creek_steffens_b',
  name: 'B Part (Steffens)',
  measures: [
    // ── m9: G — Slide on S3 + pull-off (3P2) ──
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },  // 2S4
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 5, fret: 0, beat: 2, finger: 'T' },     // G drone
        { string: 1, fret: 0, beat: 3, finger: 'M' },     // D4
        { string: 3, fret: 3, beat: 4, finger: 'T', technique: 'pull', slideToFret: 2 },  // 3P2 (A#→A)
        { string: 2, fret: 0, beat: 5, finger: 'I' },     // B3
        { string: 3, fret: 0, beat: 6, finger: 'T' },     // G3
        { string: 1, fret: 0, beat: 7, finger: 'M' },     // D4
      ],
    },
    // ── m10: G — Slide on S3 with S4 bass note ──
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },  // 2S4
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 5, fret: 0, beat: 2, finger: 'T' },     // G drone
        { string: 1, fret: 0, beat: 3, finger: 'M' },     // D4
        { string: 4, fret: 0, beat: 4, finger: 'T' },     // D3 bass
        { string: 5, fret: 0, beat: 5, finger: 'T' },     // G drone
        { string: 1, fret: 0, beat: 6, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 6, finger: 'T' },     // G drone (pinch with S1)
      ],
    },
    // ── m11: G — Repeat of m9 (slide + pull-off) ──
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 5, fret: 0, beat: 2, finger: 'T' },
        { string: 1, fret: 0, beat: 3, finger: 'M' },
        { string: 3, fret: 3, beat: 4, finger: 'T', technique: 'pull', slideToFret: 2 },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 3, fret: 0, beat: 6, finger: 'T' },
        { string: 1, fret: 0, beat: 7, finger: 'M' },
      ],
    },
    // ── m12: D7 → G — Hammer-on turnaround ──
    {
      chord: 'D7',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },  // 0H2
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 2, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },     // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T' },     // G3
        { string: 5, fret: 0, beat: 5, finger: 'T' },     // G drone
        { string: 1, fret: 0, beat: 6, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 6, finger: 'T' },     // G drone (pinch with S1)
      ],
    },
    // ── m13: G — Repeat of m9 ──
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 5, fret: 0, beat: 2, finger: 'T' },
        { string: 1, fret: 0, beat: 3, finger: 'M' },
        { string: 3, fret: 3, beat: 4, finger: 'T', technique: 'pull', slideToFret: 2 },
        { string: 2, fret: 0, beat: 5, finger: 'I' },
        { string: 3, fret: 0, beat: 6, finger: 'T' },
        { string: 1, fret: 0, beat: 7, finger: 'M' },
      ],
    },
    // ── m14: G — Repeat of m10 ──
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },
        { string: 2, fret: 0, beat: 1, finger: 'I' },
        { string: 5, fret: 0, beat: 2, finger: 'T' },
        { string: 1, fret: 0, beat: 3, finger: 'M' },
        { string: 4, fret: 0, beat: 4, finger: 'T' },
        { string: 5, fret: 0, beat: 5, finger: 'T' },
        { string: 1, fret: 0, beat: 6, finger: 'M' },
        { string: 5, fret: 0, beat: 6, finger: 'T' },  // pinch with S1
      ],
    },
    // ── m15: G — Varied ending with extra S2 fills ──
    {
      chord: 'G',
      notes: [
        { string: 3, fret: 2, beat: 0, finger: 'T', technique: 'slide', slideToFret: 4 },  // 2S4
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 2, finger: 'M' },     // D4
        { string: 2, fret: 0, beat: 3, finger: 'I' },     // B3 (extra fill)
        { string: 3, fret: 3, beat: 4, finger: 'T', technique: 'pull', slideToFret: 2 },  // 3P2
        { string: 1, fret: 0, beat: 5, finger: 'M' },     // D4
        { string: 3, fret: 0, beat: 6, finger: 'T' },     // G3
        { string: 1, fret: 0, beat: 7, finger: 'M' },     // D4
      ],
    },
    // ── m16: D7 → G — Final hammer-on and resolution ──
    {
      chord: 'D7',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },  // 0H2
        { string: 2, fret: 0, beat: 1, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 2, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },     // G drone
        { string: 3, fret: 0, beat: 4, finger: 'T' },     // G3 (resolution)
        { string: 2, fret: 0, beat: 5, finger: 'I' },     // B3
        { string: 1, fret: 0, beat: 6, finger: 'M' },     // D4
        { string: 5, fret: 0, beat: 7, finger: 'T' },     // G drone (final)
      ],
    },
  ],
}

// ── Blackberry Blossom — Scruggs-Style Arrangement ──────────────────────────
// Source: training_material/BanjoTabs/black1.txt
// Standard Blackberry Blossom fiddle tune adapted for banjo.
// A Part: G-D (repeated 4x), B Part: C-G / C-G with 1st and 2nd endings.
// Features slide 4→5 on string 4 (F#→G approach), melodic passages on strings
// 1-2 up the neck (frets 7-10 over D chord), and pinch notes.

// A Part: 2 measures — G with slide + D with melodic run
// The signature opening is the 4→5 slide on string 4 (F#3→G3 approach into G chord).
// Over D chord, melody ascends on strings 2 (fret 10=A4) and 1 (fret 9=B4),
// then descends through fret 7 (F#4/A4) with string 5 drone throughout.

const BLACKBERRY_BLOSSOM_A: SongSection = {
  id: 'blackberry_blossom_a',
  name: 'A Part',
  measures: [
    // Measure 1: G — slide 4→5 on S4, open strings, pinch at end
    {
      chord: 'G',
      notes: [
        { string: 4, fret: 4, beat: 0, finger: 'T', technique: 'slide', slideToFret: 5 },  // F#3→G3 approach
        { string: 3, fret: 0, beat: 1, finger: 'T' },   // G3
        { string: 1, fret: 0, beat: 2, finger: 'M' },   // D4
        { string: 5, fret: 0, beat: 3, finger: 'T' },   // G4 drone
        { string: 3, fret: 0, beat: 4, finger: 'T' },   // G3
        { string: 3, fret: 0, beat: 5, finger: 'T' },   // G3 (muted ghost stroke)
        { string: 1, fret: 0, beat: 6, finger: 'M' },   // D4 — pinch with S5
        { string: 5, fret: 0, beat: 6, finger: 'T' },   // G4 — pinch with S1
      ],
    },
    // Measure 2: D — melodic run up the neck: A4, B4, F#4, A4 with G4 drone
    {
      chord: 'D',
      notes: [
        { string: 5, fret: 0, beat: 0, finger: 'T' },    // G4 drone
        { string: 2, fret: 10, beat: 1, finger: 'I' },   // A4 (D chord 5th)
        { string: 1, fret: 9, beat: 2, finger: 'M' },    // B4 (scale tone — 6th of D)
        { string: 5, fret: 0, beat: 3, finger: 'T' },    // G4 drone
        { string: 2, fret: 7, beat: 4, finger: 'I' },    // F#4 (D chord 3rd)
        { string: 1, fret: 7, beat: 5, finger: 'M' },    // A4 (D chord 5th)
        { string: 5, fret: 0, beat: 6, finger: 'T' },    // G4 drone
        { string: 2, fret: 7, beat: 7, finger: 'I' },    // F#4 (D chord 3rd)
      ],
    },
  ],
}

// B Part: 2 measures — C→G half-measure changes, with melodic passages
// Measure 3: C position (frets 9/7 on S3/S2 = E4/F#4) into G open strings.
// Measure 4: C position with hammer-on 0→2 on S4 (D3→E3), then G resolution.

const BLACKBERRY_BLOSSOM_B: SongSection = {
  id: 'blackberry_blossom_b',
  name: 'B Part',
  measures: [
    // Measure 3: C (beats 0-3) → G (beats 4-7)
    {
      chord: 'C',
      notes: [
        { string: 3, fret: 9, beat: 0, finger: 'T' },    // E4 (C chord 3rd)
        { string: 2, fret: 7, beat: 1, finger: 'I' },    // F#4 (passing tone → G)
        { string: 5, fret: 0, beat: 2, finger: 'T' },    // G4 (C chord 5th)
        { string: 3, fret: 9, beat: 3, finger: 'T' },    // E4 (C chord 3rd)
        { string: 1, fret: 0, beat: 4, finger: 'M' },    // D4 (G chord context)
        { string: 2, fret: 0, beat: 5, finger: 'I' },    // B3 (G chord 3rd)
        { string: 3, fret: 0, beat: 6, finger: 'T' },    // G3 (G chord root)
        { string: 1, fret: 0, beat: 7, finger: 'M' },    // D4 (G chord 5th)
      ],
    },
    // Measure 4: C (beats 0-3) → G (beats 4-7) — hammer-on on S4
    {
      chord: 'C',
      notes: [
        { string: 4, fret: 0, beat: 0, finger: 'T', technique: 'hammer', slideToFret: 2 },  // D3→E3 (C chord 3rd)
        { string: 2, fret: 1, beat: 1, finger: 'I' },    // C4 (C chord root)
        { string: 3, fret: 0, beat: 2, finger: 'T' },    // G3 (C chord 5th)
        { string: 1, fret: 2, beat: 3, finger: 'M' },    // E4 (C chord 3rd)
        { string: 4, fret: 0, beat: 4, finger: 'T' },    // D3 (G chord context)
        { string: 4, fret: 0, beat: 5, finger: 'T' },    // D3 (muted ghost stroke)
        { string: 4, fret: 5, beat: 6, finger: 'T' },    // G3 (G chord root)
        { string: 3, fret: 2, beat: 7, finger: 'T' },    // A3 (scale tone — 2nd of G)
      ],
    },
  ],
}

// 1st Ending: A→D (1 measure) — descending melody through A chord into D resolution
// Walk-down: B3→G3→A3→B3→A3 then D4 with ghost notes.

const BLACKBERRY_BLOSSOM_END1: SongSection = {
  id: 'blackberry_blossom_end1',
  name: '1st Ending',
  measures: [
    // A (beats 0-3) → D (beats 4-7)
    {
      chord: 'A',
      notes: [
        { string: 2, fret: 0, beat: 0, finger: 'I' },    // B3 (passing tone)
        { string: 4, fret: 5, beat: 1, finger: 'T' },    // G3 (passing tone)
        { string: 3, fret: 2, beat: 2, finger: 'T' },    // A3 (A chord root)
        { string: 2, fret: 0, beat: 3, finger: 'I' },    // B3 (passing tone)
        { string: 3, fret: 2, beat: 4, finger: 'T' },    // A3 (D chord 5th)
        { string: 3, fret: 0, beat: 5, finger: 'T' },    // G3 (muted ghost stroke)
        { string: 1, fret: 0, beat: 6, finger: 'M' },    // D4 (D chord root)
        { string: 1, fret: 0, beat: 7, finger: 'M' },    // D4 (muted ghost stroke)
      ],
    },
  ],
}

// 2nd Ending: D→G (1 measure) — descending through D chord into G resolution
// Walk-down: B3→G3→A3→F#3→G3 then chromatic D#3 approach.

const BLACKBERRY_BLOSSOM_END2: SongSection = {
  id: 'blackberry_blossom_end2',
  name: '2nd Ending',
  measures: [
    // D (beats 0-3) → G (beats 4-7)
    {
      chord: 'D',
      notes: [
        { string: 2, fret: 0, beat: 0, finger: 'I' },    // B3 (passing tone)
        { string: 4, fret: 5, beat: 1, finger: 'T' },    // G3 (passing tone)
        { string: 3, fret: 2, beat: 2, finger: 'T' },    // A3 (D chord 5th)
        { string: 4, fret: 4, beat: 3, finger: 'T' },    // F#3 (D chord 3rd)
        { string: 3, fret: 0, beat: 4, finger: 'T' },    // G3 (G chord root)
        { string: 3, fret: 0, beat: 5, finger: 'T' },    // G3 (muted ghost stroke)
        { string: 4, fret: 1, beat: 6, finger: 'T' },    // D#3 (chromatic approach → D)
        { string: 4, fret: 0, beat: 7, finger: 'T' },    // D3 (muted ghost stroke)
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
  // ── Cripple Creek — Steffens Arrangement ─────────────────────────────────
  // Source: Joerg Steffens tab (training_material/BanjoTabs/crip.txt)
  // More melodic than simplified version: string 1 melody with slides on S1 & S3,
  // hammer-ons on S4, and pull-offs on S3 in the B part.
  {
    id: 'cripple_creek_steffens',
    name: 'Cripple Creek (Steffens)',
    key: 'G',
    defaultBpm: 80,
    performanceBpm: 120,
    sections: [CRIPPLE_CREEK_STEFFENS_A, CRIPPLE_CREEK_STEFFENS_B],
    structure: ['cripple_creek_steffens_a', 'cripple_creek_steffens_b'],
  },
  // ── Blackberry Blossom — Scruggs-style arrangement ─────────────────────────
  // Source: training_material/BanjoTabs/black1.txt (Joerg Steffens tab)
  // Key of G, A part (G-D repeated 4x) + B part (C-G, C-G, endings).
  // Features melodic passages up the neck on strings 1-2, slide on string 4,
  // and pinch notes. Half-measure chord changes in B part.
  {
    id: 'blackberry_blossom',
    name: 'Blackberry Blossom',
    key: 'G',
    defaultBpm: 80,
    performanceBpm: 130,
    sections: [BLACKBERRY_BLOSSOM_A, BLACKBERRY_BLOSSOM_B, BLACKBERRY_BLOSSOM_END1, BLACKBERRY_BLOSSOM_END2],
    structure: [
      'blackberry_blossom_a', 'blackberry_blossom_a', 'blackberry_blossom_a', 'blackberry_blossom_a',
      'blackberry_blossom_b',
      'blackberry_blossom_end1',
      'blackberry_blossom_a', 'blackberry_blossom_a', 'blackberry_blossom_a', 'blackberry_blossom_a',
      'blackberry_blossom_b',
      'blackberry_blossom_end2',
    ],
  },
]

export const SONG_MAP = new Map(SONGS.map((s) => [s.id, s]))
export const SECTION_MAP = new Map(
  SONGS.flatMap((s) => s.sections.map((sec) => [sec.id, sec]))
)

export interface HighwayNote {
  id: string
  string: number       // 1-5 banjo string
  fret: number         // 0 = open
  time: number         // seconds from start
  duration: number     // seconds
  state: 'upcoming' | 'current' | 'hit' | 'miss'
}

export interface HighwayConfig {
  laneCount: number          // 5
  strikeZoneX: number        // 0.15 (15% from left)
  scrollSpeed: number        // pixels per second
  hitWindowMs: number        // 100ms timing window
  noteWidth: number          // pixels
  noteHeight: number         // pixels
  laneColors: string[]       // per-string colors
}

export const DEFAULT_HIGHWAY_CONFIG: HighwayConfig = {
  laneCount: 5,
  strikeZoneX: 0.15,
  scrollSpeed: 200,
  hitWindowMs: 100,
  noteWidth: 50,
  noteHeight: 28,
  laneColors: [
    '#D4A04A', // string 1 (top)
    '#4ADE80', // string 2
    '#4A9EFF', // string 3
    '#C084FC', // string 4
    '#F5A623', // string 5 (bottom)
  ],
}

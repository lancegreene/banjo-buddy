// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Cinematic Banjo Anatomy Tour (Framer Motion)
// Single continuous auto-playing animation that zooms through every part of the
// banjo with path drawing, spring zooms, staggered reveals, and string pluck fx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useSpring, useMotionValueEvent } from 'framer-motion'
import { useBanjoSynth } from '../../hooks/useBanjoSynth'

// ── Narration hook (Web Speech API, British voice) ──────────────────────────

function useBritishNarrator() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const [muted, setMuted] = useState(false)
  const [ready, setReady] = useState(false)

  // Pick a British voice once voices are loaded
  useEffect(() => {
    const pick = () => {
      const voices = speechSynthesis.getVoices()
      if (voices.length === 0) return

      // Score voices — prefer en-GB, then en, prefer "natural" or non-compact
      const scored = voices
        .filter(v => v.lang.startsWith('en'))
        .map(v => {
          let score = 0
          if (v.lang === 'en-GB') score += 100
          else if (v.lang.startsWith('en-GB')) score += 80
          const n = v.name.toLowerCase()
          if (n.includes('natural')) score += 20
          if (n.includes('female') || n.includes('hazel') || n.includes('susan')) score += 10
          if (!n.includes('compact')) score += 5
          return { voice: v, score }
        })
        .sort((a, b) => b.score - a.score)

      voiceRef.current = scored[0]?.voice ?? null
      setReady(true)

      if (scored[0]) {
        console.log('[BanjoTour] Narrator voice:', scored[0].voice.name, scored[0].voice.lang)
      } else {
        console.warn('[BanjoTour] No English voice found. Available:', voices.map(v => `${v.name} (${v.lang})`))
      }
    }
    pick()
    // Chrome loads voices async — listen for the event
    speechSynthesis.addEventListener('voiceschanged', pick)
    return () => speechSynthesis.removeEventListener('voiceschanged', pick)
  }, [])

  const speak = useCallback((text: string) => {
    // Cancel any in-progress speech first
    speechSynthesis.cancel()
    if (muted) return

    const utt = new SpeechSynthesisUtterance(text)
    if (voiceRef.current) utt.voice = voiceRef.current
    utt.lang = 'en-GB'
    utt.rate = 0.95
    utt.pitch = 1.0
    utt.volume = 1.0

    // Chrome bug workaround: speechSynthesis can stall after ~15s.
    // A periodic resume poke keeps it alive.
    let keepAlive: ReturnType<typeof setInterval> | null = null
    utt.onstart = () => {
      keepAlive = setInterval(() => {
        if (!speechSynthesis.speaking) {
          if (keepAlive) clearInterval(keepAlive)
          return
        }
        speechSynthesis.pause()
        speechSynthesis.resume()
      }, 10000)
    }
    utt.onend = () => { if (keepAlive) clearInterval(keepAlive) }
    utt.onerror = (e) => {
      if (keepAlive) clearInterval(keepAlive)
      console.warn('[BanjoTour] Speech error:', e.error)
    }

    speechSynthesis.speak(utt)
  }, [muted])

  const pause = useCallback(() => { speechSynthesis.pause() }, [])
  const resume = useCallback(() => { speechSynthesis.resume() }, [])
  const cancel = useCallback(() => { speechSynthesis.cancel() }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      if (!prev) speechSynthesis.cancel()
      return !prev
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => () => { speechSynthesis.cancel() }, [])

  return { speak, pause, resume, cancel, muted, toggleMute, ready }
}

// ── Segment timeline ────────────────────────────────────────────────────────

interface Segment {
  id: string
  title: string
  subtitle: string
  description: string
  viewBox: string
  highlights: string[]
  duration: number          // seconds this segment is visible
}

const SEGMENTS: Segment[] = [
  {
    id: 'overview',
    title: 'Meet the Banjo',
    subtitle: 'Full View',
    description: 'Three main sections: the pot (round body), the neck, and the peghead — each shaping that bright, twangy tone.',
    viewBox: '0 0 600 920',
    highlights: [],
    duration: 4,
  },
  {
    id: 'pot',
    title: 'The Pot',
    subtitle: 'Body / Pot Assembly',
    description: 'A wooden rim with a head stretched across — like a drum. This gives the banjo its sharp, punchy sound.',
    viewBox: '80 20 440 340',
    highlights: ['head', 'rim', 'hooks'],
    duration: 4.5,
  },
  {
    id: 'bridge',
    title: 'The Bridge',
    subtitle: 'Bridge',
    description: 'Sits on the head (not glued — string tension holds it). Transfers vibration into the head.',
    viewBox: '170 180 260 120',
    highlights: ['bridge'],
    duration: 3.5,
  },
  {
    id: 'tailpiece',
    title: 'The Tailpiece',
    subtitle: 'Tailpiece',
    description: 'Anchors the strings at the bottom. Strings loop through and run up over the bridge.',
    viewBox: '190 280 220 120',
    highlights: ['tailpiece'],
    duration: 3,
  },
  {
    id: 'armrest',
    title: 'The Armrest',
    subtitle: 'Armrest',
    description: 'Gives your picking arm a comfortable rest and prevents damping the head.',
    viewBox: '300 80 280 220',
    highlights: ['armrest'],
    duration: 3,
  },
  {
    id: 'strings',
    title: 'The 5 Strings',
    subtitle: 'Open G Tuning',
    description: 'Open G tuning (gDGBd). Strum all open strings and you hear a G major chord.',
    viewBox: '130 20 340 400',
    highlights: ['strings'],
    duration: 4,
  },
  {
    id: 'tuning',
    title: 'String Tunings',
    subtitle: 'gDGBd',
    description: 'String 4 = D3, String 3 = G3, String 2 = B3, String 1 = D4, String 5 = G4 (drone).',
    viewBox: '100 10 400 300',
    highlights: ['strings', 'tuning-labels'],
    duration: 5,
  },
  {
    id: 'neck',
    title: 'The Neck',
    subtitle: 'Neck & Fingerboard',
    description: 'Metal frets embedded in the fingerboard. Press strings against frets to change pitch.',
    viewBox: '160 340 280 380',
    highlights: ['neck'],
    duration: 3.5,
  },
  {
    id: 'frets',
    title: 'How Frets Work',
    subtitle: 'The Math of Music',
    description: 'Each fret = one half step. 12 frets = one octave. Frets get closer together up the neck.',
    viewBox: '160 370 280 340',
    highlights: ['frets', 'fret-dots'],
    duration: 4.5,
  },
  {
    id: 'halfsteps',
    title: 'Half Steps & Whole Steps',
    subtitle: 'Music Theory on the Neck',
    description: 'G → G# → A → A# → B → C … Each fret is one half step. Two frets = one whole step.',
    viewBox: '140 370 320 340',
    highlights: ['frets', 'scale-notes'],
    duration: 5,
  },
  {
    id: 'peghead',
    title: 'The Peghead',
    subtitle: 'Peghead & Tuning Pegs',
    description: 'Four geared tuning pegs for strings 1-4. Turn to tighten or loosen.',
    viewBox: '140 720 320 200',
    highlights: ['peghead', 'tuners'],
    duration: 4,
  },
  {
    id: 'nut',
    title: 'The Nut',
    subtitle: 'Nut',
    description: 'Slotted piece at the top of the neck. Spaces the strings and sets height. Open strings vibrate from here to the bridge.',
    viewBox: '170 340 260 80',
    highlights: ['nut'],
    duration: 3.5,
  },
  {
    id: 'fifth-peg',
    title: '5th String Peg',
    subtitle: 'Unique to 5-String Banjo',
    description: 'String 5\'s peg sits in the side of the neck at the 5th fret — the signature drone string.',
    viewBox: '100 440 260 140',
    highlights: ['fifth-peg'],
    duration: 4,
  },
  {
    id: 'fingers',
    title: 'Picking Hand',
    subtitle: 'T-I-M: Thumb, Index, Middle',
    description: 'Thumb picks strings 3, 4, 5. Index picks string 2. Middle picks string 1. Roll patterns combine them.',
    viewBox: '80 20 440 340',
    highlights: ['strings', 'finger-labels'],
    duration: 5,
  },
]

const TOTAL_DURATION = SEGMENTS.reduce((t, s) => t + s.duration, 0)

// Cumulative start times
const SEGMENT_STARTS = SEGMENTS.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEGMENTS[i - 1].duration)
  return acc
}, [])

// ── Animation helpers ─────────────────────────────────────────────────────

function parseViewBox(vb: string): [number, number, number, number] {
  const [x, y, w, h] = vb.split(' ').map(Number)
  return [x, y, w, h]
}

const springConfig = { stiffness: 120, damping: 20, mass: 0.8 }

const drawVariant = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 0.8, delay, ease: 'easeInOut' }, opacity: { duration: 0.2, delay } },
  }),
}

const popVariant = {
  hidden: { scale: 0, opacity: 0 },
  visible: (delay: number) => ({
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 15, delay },
  }),
}

const fadeUpVariant = {
  hidden: { opacity: 0, y: 8 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 18, delay },
  }),
}

// ── Animated SVG ────────────────────────────────────────────────────────────

function BanjoSVG({ highlights, viewBox }: { highlights: Set<string>; viewBox: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const target = parseViewBox(viewBox)

  const vbX = useSpring(target[0], springConfig)
  const vbY = useSpring(target[1], springConfig)
  const vbW = useSpring(target[2], springConfig)
  const vbH = useSpring(target[3], springConfig)

  useEffect(() => {
    vbX.set(target[0])
    vbY.set(target[1])
    vbW.set(target[2])
    vbH.set(target[3])
  }, [target, vbX, vbY, vbW, vbH])

  useMotionValueEvent(vbX, 'change', () => {
    if (svgRef.current) {
      svgRef.current.setAttribute(
        'viewBox',
        `${vbX.get().toFixed(1)} ${vbY.get().toFixed(1)} ${vbW.get().toFixed(1)} ${vbH.get().toFixed(1)}`
      )
    }
  })

  const hl = (part: string) => highlights.has(part)
  const glow = (part: string) => hl(part) ? 'ba-glow' : 'ba-dim'
  const noHl = highlights.size === 0

  const FRET_YS = [0, 42, 78, 110, 138, 163, 185, 204, 221, 236, 250, 262, 273]
  const NECK_TOP = 380
  const NECK_H = 340
  const STR_X = [252, 268, 284, 300, 316]
  const STR_COLORS: Record<number, string> = {
    4: '#F5A623', 3: '#4A9EFF', 2: '#4ADE80', 1: '#FF6B6B', 5: '#C084FC',
  }
  const SCALE_NOTES = ['G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G']
  const stringPluck = hl('strings')

  return (
    <svg ref={svgRef} viewBox="0 0 600 920" className="ba-svg">
      {/* ── Pot / Head ── */}
      <g className={noHl ? '' : glow('head')}>
        <motion.circle cx="284" cy="180" r="155" stroke="currentColor" strokeWidth="3" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }} />
        <motion.circle cx="284" cy="180" r="145" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.0, delay: 0.3, ease: 'easeInOut' }} />
        <motion.circle cx="284" cy="180" r="135" stroke="currentColor" strokeWidth="0.7" strokeDasharray="5 4" fill="none" opacity="0.4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeInOut' }} />
      </g>

      {/* Rim */}
      <g className={noHl ? '' : glow('rim')}>
        <motion.circle cx="284" cy="180" r="158" stroke="currentColor" strokeWidth="5" fill="none" opacity="0.3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }} />
      </g>

      {/* Tension hooks — staggered */}
      <g className={noHl ? '' : glow('hooks')}>
        {[...Array(20)].map((_, i) => {
          const a = (i / 20) * Math.PI * 2 - Math.PI / 2
          const x1 = 284 + Math.cos(a) * 145, y1 = 180 + Math.sin(a) * 145
          const x2 = 284 + Math.cos(a) * 157, y2 = 180 + Math.sin(a) * 157
          return (
            <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="currentColor" strokeWidth="2"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 0.6, pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.04 }} />
          )
        })}
      </g>

      {/* Bridge */}
      <g className={noHl ? '' : glow('bridge')}>
        <motion.rect x="240" y="230" width="88" height="7" rx="2"
          stroke="currentColor" strokeWidth="1.5"
          fill={hl('bridge') ? 'rgba(74,158,255,0.3)' : 'none'}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }} style={{ originX: '50%' }} />
        <AnimatePresence>
          {hl('bridge') && (
            <motion.text x="284" y="255" textAnchor="middle" fontSize="10" fill="currentColor"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 0.7, y: 0 }} exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}>Bridge</motion.text>
          )}
        </AnimatePresence>
      </g>

      {/* Tailpiece */}
      <g className={noHl ? '' : glow('tailpiece')}>
        <motion.path d="M255 310 L284 330 L313 310" stroke="currentColor" strokeWidth="2"
          fill={hl('tailpiece') ? 'rgba(74,158,255,0.2)' : 'none'}
          variants={drawVariant} initial="hidden" animate="visible" custom={0.6} />
        <motion.line x1="284" y1="325" x2="284" y2="345" stroke="currentColor" strokeWidth="1.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }} />
        <AnimatePresence>
          {hl('tailpiece') && (
            <motion.text x="284" y="360" textAnchor="middle" fontSize="10" fill="currentColor"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 0.7, y: 0 }} exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}>Tailpiece</motion.text>
          )}
        </AnimatePresence>
      </g>

      {/* Armrest — path draw */}
      <g className={noHl ? '' : glow('armrest')}>
        <motion.path d="M395 100 Q440 180 395 260" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"
          opacity={hl('armrest') ? 1 : 0.4}
          variants={drawVariant} initial="hidden" animate="visible" custom={0.4} />
        <AnimatePresence>
          {hl('armrest') && (
            <>
              <motion.path d="M395 100 Q440 180 395 260" stroke="#4a9eff" strokeWidth="6" fill="none" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.3 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }} />
              <motion.text x="450" y="185" fontSize="10" fill="currentColor"
                variants={fadeUpVariant} initial="hidden" animate="visible" exit="hidden" custom={0.3}>Armrest</motion.text>
            </>
          )}
        </AnimatePresence>
      </g>

      {/* ── Strings — pluck wave when highlighted ── */}
      <g className={noHl ? '' : glow('strings')}>
        {[4, 3, 2, 1].map((s, i) => {
          const x = STR_X[i], color = STR_COLORS[s]
          if (stringPluck) {
            const midY = 175
            return (
              <motion.path key={s}
                d={`M${x} 40 Q${x} ${midY} ${x} 310`}
                stroke={color} strokeWidth={1.2} fill="none" opacity={0.9}
                animate={{ d: [
                  `M${x} 40 Q${x + 4} ${midY} ${x} 310`,
                  `M${x} 40 Q${x - 3} ${midY} ${x} 310`,
                  `M${x} 40 Q${x + 2} ${midY} ${x} 310`,
                  `M${x} 40 Q${x - 1} ${midY} ${x} 310`,
                  `M${x} 40 Q${x} ${midY} ${x} 310`,
                ] }}
                transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }} />
            )
          }
          return (
            <motion.line key={s} x1={x} y1={40} x2={x} y2={310}
              stroke="currentColor" strokeWidth={0.7} opacity={0.5}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }} />
          )
        })}
        {stringPluck ? (
          <motion.path
            d={`M${STR_X[4]} 80 Q${STR_X[4]} 195 ${STR_X[4]} 310`}
            stroke={STR_COLORS[5]} strokeWidth={1.2} fill="none" opacity={0.9}
            animate={{ d: [
              `M${STR_X[4]} 80 Q${STR_X[4] + 4} 195 ${STR_X[4]} 310`,
              `M${STR_X[4]} 80 Q${STR_X[4] - 3} 195 ${STR_X[4]} 310`,
              `M${STR_X[4]} 80 Q${STR_X[4] + 2} 195 ${STR_X[4]} 310`,
              `M${STR_X[4]} 80 Q${STR_X[4] - 1} 195 ${STR_X[4]} 310`,
              `M${STR_X[4]} 80 Q${STR_X[4]} 195 ${STR_X[4]} 310`,
            ] }}
            transition={{ duration: 1.2, delay: 0.6, ease: 'easeOut' }} />
        ) : (
          <motion.line x1={STR_X[4]} y1={80} x2={STR_X[4]} y2={310}
            stroke="currentColor" strokeWidth={0.7} opacity={0.5}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }} />
        )}
      </g>

      {/* Tuning labels */}
      <AnimatePresence>
        {hl('tuning-labels') && (
          <motion.g key="tuning-labels">
            {[
              { x: STR_X[0], note: 'D3', label: 'str 4', color: STR_COLORS[4] },
              { x: STR_X[1], note: 'G3', label: 'str 3', color: STR_COLORS[3] },
              { x: STR_X[2], note: 'B3', label: 'str 2', color: STR_COLORS[2] },
              { x: STR_X[3], note: 'D4', label: 'str 1', color: STR_COLORS[1] },
            ].map((s, i) => (
              <motion.g key={s.note} variants={fadeUpVariant} initial="hidden" animate="visible" exit="hidden" custom={i * 0.1}>
                <text x={s.x} y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={s.color}>{s.note}</text>
                <text x={s.x} y="18" textAnchor="middle" fontSize="7" fill={s.color}>{s.label}</text>
              </motion.g>
            ))}
            <motion.g variants={fadeUpVariant} initial="hidden" animate="visible" exit="hidden" custom={0.4}>
              <text x={STR_X[4] + 20} y="80" fontSize="11" fontWeight="700" fill={STR_COLORS[5]}>G4</text>
              <text x={STR_X[4] + 20} y="92" fontSize="7" fill={STR_COLORS[5]}>str 5 (drone)</text>
            </motion.g>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Finger labels */}
      <AnimatePresence>
        {hl('finger-labels') && (
          <motion.g key="finger-labels">
            {[
              { x: STR_X[0] - 5, label: 'T', color: STR_COLORS[4], anchor: 'end' as const },
              { x: STR_X[1], label: 'T', color: STR_COLORS[3], anchor: 'middle' as const },
              { x: STR_X[2], label: 'I', color: STR_COLORS[2], anchor: 'middle' as const },
              { x: STR_X[3], label: 'M', color: STR_COLORS[1], anchor: 'middle' as const },
              { x: STR_X[4] + 5, label: 'T', color: STR_COLORS[5], anchor: 'start' as const },
            ].map((f, i) => (
              <motion.text key={i} x={f.x} y="320" textAnchor={f.anchor} fontSize="10" fontWeight="700" fill={f.color}
                variants={popVariant} initial="hidden" animate="visible" exit="hidden" custom={i * 0.08}>{f.label}</motion.text>
            ))}
          </motion.g>
        )}
      </AnimatePresence>

      {/* ── Nut ── */}
      <g className={noHl ? '' : glow('nut')}>
        <motion.rect x="245" y={NECK_TOP - 4} width="78" height="6" rx="1"
          fill={hl('nut') ? 'rgba(255,255,255,0.4)' : 'currentColor'}
          opacity={hl('nut') ? 1 : 0.6}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }} style={{ originX: '50%' }} />
        <AnimatePresence>
          {hl('nut') && (
            <motion.text x="284" y={NECK_TOP - 10} textAnchor="middle" fontSize="10" fill="currentColor"
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}>Nut</motion.text>
          )}
        </AnimatePresence>
      </g>

      {/* ── Neck ── */}
      <g className={noHl ? '' : glow('neck')}>
        <motion.rect x="248" y={NECK_TOP} width="72" height={NECK_H} rx="4"
          stroke="currentColor" strokeWidth="2.5" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.0, delay: 0.2 }} />
      </g>

      {/* ── Frets — staggered ── */}
      <g className={noHl ? '' : glow('frets')}>
        {FRET_YS.map((y, i) => (
          <motion.line key={i} x1="248" y1={NECK_TOP + y} x2="320" y2={NECK_TOP + y}
            stroke="currentColor" strokeWidth={i === 0 ? 0 : 1.2} opacity="0.7"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }} />
        ))}
      </g>

      {/* Fret numbers */}
      <AnimatePresence>
        {hl('frets') && FRET_YS.slice(1).map((y, i) => (
          <motion.text key={i} x="238" y={NECK_TOP + y + 4} textAnchor="end" fontSize="8" fill="currentColor"
            variants={fadeUpVariant} initial="hidden" animate="visible" exit="hidden" custom={i * 0.05}>{i + 1}</motion.text>
        ))}
      </AnimatePresence>

      {/* ── Fret dots — pop in ── */}
      <g className={noHl ? '' : glow('fret-dots')}>
        {[3, 5, 7, 10].map((f, idx) => {
          const y = NECK_TOP + FRET_YS[f] - (FRET_YS[f] - FRET_YS[f - 1]) / 2
          return (
            <motion.circle key={f} cx="284" cy={y} r="3.5" fill="currentColor"
              opacity={hl('fret-dots') ? 0.7 : 0.3}
              variants={popVariant} initial="hidden" animate="visible" custom={0.6 + idx * 0.1} />
          )
        })}
        {FRET_YS[12] && (() => {
          const y = NECK_TOP + FRET_YS[12] - (FRET_YS[12] - FRET_YS[11]) / 2
          return (
            <>
              <motion.circle cx="275" cy={y} r="3" fill="currentColor" opacity={hl('fret-dots') ? 0.7 : 0.3}
                variants={popVariant} initial="hidden" animate="visible" custom={1.0} />
              <motion.circle cx="293" cy={y} r="3" fill="currentColor" opacity={hl('fret-dots') ? 0.7 : 0.3}
                variants={popVariant} initial="hidden" animate="visible" custom={1.05} />
            </>
          )
        })()}
      </g>

      {/* Scale notes — spring cascade */}
      <AnimatePresence>
        {hl('scale-notes') && SCALE_NOTES.map((note, i) => {
          if (i >= FRET_YS.length) return null
          const y = i === 0 ? NECK_TOP - 2 : NECK_TOP + FRET_YS[i] - (FRET_YS[i] - FRET_YS[i - 1]) / 2
          const isNatural = !note.includes('#')
          return (
            <motion.g key={`note-${i}`}
              initial={{ opacity: 0, x: -15, scale: 0.5 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -15, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 250, damping: 18, delay: i * 0.08 }}>
              <circle cx="268" cy={y} r={isNatural ? 9 : 7}
                fill={isNatural ? 'rgba(74,158,255,0.35)' : 'rgba(255,255,255,0.1)'} />
              <text x="268" y={y + 3.5} textAnchor="middle"
                fontSize={isNatural ? 8 : 6.5} fontWeight={isNatural ? '700' : '400'}
                fill={isNatural ? '#4A9EFF' : 'rgba(255,255,255,0.5)'}>{note}</text>
            </motion.g>
          )
        })}
      </AnimatePresence>

      {/* ── 5th String Peg ── */}
      <g className={noHl ? '' : glow('fifth-peg')}>
        <motion.circle cx="238" cy={NECK_TOP + FRET_YS[5] - (FRET_YS[5] - FRET_YS[4]) / 2} r="6"
          stroke="currentColor" strokeWidth="1.5"
          fill={hl('fifth-peg') ? 'rgba(192,132,252,0.3)' : 'none'}
          variants={popVariant} initial="hidden" animate="visible" custom={0.5} />
        <motion.line x1="244" y1={NECK_TOP + FRET_YS[5] - (FRET_YS[5] - FRET_YS[4]) / 2}
          x2="248" y2={NECK_TOP + FRET_YS[5] - (FRET_YS[5] - FRET_YS[4]) / 2}
          stroke="currentColor" strokeWidth="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }} />
        <AnimatePresence>
          {hl('fifth-peg') && (
            <motion.text x="220" y={NECK_TOP + FRET_YS[5] - (FRET_YS[5] - FRET_YS[4]) / 2 - 12}
              textAnchor="middle" fontSize="9" fill="#C084FC"
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}>5th peg</motion.text>
          )}
        </AnimatePresence>
      </g>

      {/* Strings on neck */}
      <g opacity="0.35">
        {[0, 1, 2, 3].map(i => (
          <motion.line key={i} x1={258 + i * 16} y1={NECK_TOP} x2={258 + i * 16} y2={NECK_TOP + NECK_H}
            stroke="currentColor" strokeWidth="0.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }} />
        ))}
      </g>

      {/* ── Peghead — path draw ── */}
      <g className={noHl ? '' : glow('peghead')}>
        <motion.path d="M250 720 L250 800 Q250 830 284 830 Q318 830 318 800 L318 720"
          stroke="currentColor" strokeWidth="2.5" fill="none"
          variants={drawVariant} initial="hidden" animate="visible" custom={0.3} />
      </g>

      {/* ── Tuners — pop in ── */}
      <g className={noHl ? '' : glow('tuners')}>
        {[
          { cx: 232, cy: 750 }, { cx: 232, cy: 775 },
          { cx: 336, cy: 750 }, { cx: 336, cy: 775 },
        ].map((t, i) => (
          <motion.circle key={i} cx={t.cx} cy={t.cy} r="7"
            stroke="currentColor" strokeWidth="1.5"
            fill={hl('tuners') ? 'rgba(74,158,255,0.3)' : 'none'}
            variants={popVariant} initial="hidden" animate="visible" custom={0.5 + i * 0.1} />
        ))}
        <AnimatePresence>
          {hl('tuners') && (
            <motion.g key="tuner-labels">
              {[
                { x: 215, y: 750, anchor: 'end' as const, note: 'D3', color: STR_COLORS[4] },
                { x: 215, y: 775, anchor: 'end' as const, note: 'G3', color: STR_COLORS[3] },
                { x: 353, y: 750, anchor: 'start' as const, note: 'B3', color: STR_COLORS[2] },
                { x: 353, y: 775, anchor: 'start' as const, note: 'D4', color: STR_COLORS[1] },
              ].map((l, i) => (
                <motion.text key={l.note} x={l.x} y={l.y} textAnchor={l.anchor}
                  fontSize="8" fill={l.color} dominantBaseline="middle"
                  variants={fadeUpVariant} initial="hidden" animate="visible" exit="hidden" custom={i * 0.1}>{l.note}</motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </g>

      {/* Decorative text */}
      <motion.text x="284" y="820" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif"
        fill="currentColor" opacity="0.4"
        initial={{ opacity: 0 }} animate={{ opacity: 0.4 }}
        transition={{ duration: 1.5, delay: 1.0 }}>BANJO BUDDY</motion.text>
    </svg>
  )
}

// ── Main Tour Component (Single Continuous Animation + Narration) ───────────

export function BanjoAnatomy({ onExit }: { onExit: () => void }) {
  const [started, setStarted] = useState(false)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const narrator = useBritishNarrator()
  const narrationStartedRef = useRef(-1)
  const synth = useBanjoSynth()
  const notePlayedRef = useRef(-1)

  const segment = SEGMENTS[segmentIndex]
  const highlights = new Set(segment.highlights)

  // User must click to start — this satisfies browser autoplay policy for speech
  const handleStart = useCallback(() => {
    setStarted(true)
    setPlaying(true)
    // Kick-start speech with a silent utterance to "unlock" the API
    const unlock = new SpeechSynthesisUtterance('')
    unlock.volume = 0
    speechSynthesis.speak(unlock)
  }, [])

  // Play notes for music segments when they become active
  useEffect(() => {
    if (!started || !playing) return
    if (notePlayedRef.current === segmentIndex) return

    // Half steps segment — play chromatic scale on string 3 (frets 0-12)
    if (segment.id === 'halfsteps') {
      notePlayedRef.current = segmentIndex
      const FRET_COUNT = 13  // frets 0-12
      const timeouts: ReturnType<typeof setTimeout>[] = []
      for (let fret = 0; fret < FRET_COUNT; fret++) {
        // Stagger matches animation delay: i * 0.08s = 80ms per note, + 400ms initial
        timeouts.push(setTimeout(() => {
          synth.playNote(3, fret)
        }, 500 + fret * 350))
      }
      return () => timeouts.forEach(clearTimeout)
    }

    // Tuning segment — play each open string
    if (segment.id === 'tuning') {
      notePlayedRef.current = segmentIndex
      const strings = [4, 3, 2, 1, 5]  // low to high, drone last
      const timeouts: ReturnType<typeof setTimeout>[] = []
      strings.forEach((str, i) => {
        timeouts.push(setTimeout(() => {
          synth.playNote(str, 0)
        }, 600 + i * 500))
      })
      return () => timeouts.forEach(clearTimeout)
    }

    // Frets segment — play a few frets to demonstrate pitch rising
    if (segment.id === 'frets') {
      notePlayedRef.current = segmentIndex
      const frets = [0, 3, 5, 7, 12]  // open, then dot positions
      const timeouts: ReturnType<typeof setTimeout>[] = []
      frets.forEach((fret, i) => {
        timeouts.push(setTimeout(() => {
          synth.playNote(3, fret)
        }, 800 + i * 600))
      })
      return () => timeouts.forEach(clearTimeout)
    }
  }, [segmentIndex, started, playing, segment.id, synth])

  // Tick elapsed time
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 0.05
        if (next >= TOTAL_DURATION) {
          setPlaying(false)
          return TOTAL_DURATION
        }
        return next
      })
    }, 50)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing])

  // Derive current segment from elapsed time
  useEffect(() => {
    for (let i = SEGMENTS.length - 1; i >= 0; i--) {
      if (elapsed >= SEGMENT_STARTS[i]) {
        setSegmentIndex(i)
        break
      }
    }
  }, [elapsed])

  // Narrate when segment changes
  useEffect(() => {
    if (!started) return
    if (narrationStartedRef.current === segmentIndex) return
    narrationStartedRef.current = segmentIndex
    // Small delay so the zoom/text transition starts first
    const t = setTimeout(() => {
      if (playing) {
        narrator.speak(segment.description)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [segmentIndex, started, playing, narrator, segment.description])

  // Pause/resume narration with playback
  useEffect(() => {
    if (!started) return
    if (playing) {
      narrator.resume()
    } else {
      narrator.pause()
    }
  }, [playing, started, narrator])

  const togglePlay = useCallback(() => {
    if (!started) { handleStart(); return }
    if (elapsed >= TOTAL_DURATION) {
      narrationStartedRef.current = -1
      notePlayedRef.current = -1
      setElapsed(0)
      setSegmentIndex(0)
      setPlaying(true)
    } else {
      setPlaying(p => !p)
    }
  }, [elapsed, started, handleStart])

  // Seek via progress bar
  const progressRef = useRef<HTMLDivElement>(null)
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    narrator.cancel()
    narrationStartedRef.current = -1
    notePlayedRef.current = -1
    synth.stop()
    setElapsed(pct * TOTAL_DURATION)
  }, [narrator, synth])

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay() }
      else if (e.key === 'Escape') onExit()
      else if (e.key === 'ArrowRight') {
        narrator.cancel(); narrationStartedRef.current = -1; notePlayedRef.current = -1
        setElapsed(prev => Math.min(TOTAL_DURATION, prev + 2))
      }
      else if (e.key === 'ArrowLeft') {
        narrator.cancel(); narrationStartedRef.current = -1; notePlayedRef.current = -1
        setElapsed(prev => Math.max(0, prev - 2))
      }
      else if (e.key === 'm') narrator.toggleMute()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [togglePlay, onExit, narrator])

  const progressPct = (elapsed / TOTAL_DURATION) * 100
  const finished = elapsed >= TOTAL_DURATION

  // Pre-start splash
  if (!started) {
    return (
      <div className="ba-tour">
        <motion.div className="ba-tour-header"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}>
          <button className="btn btn-sm settings-back-btn" onClick={onExit}>&larr; Back</button>
          <h2 className="ba-tour-heading">Banjo Anatomy</h2>
        </motion.div>

        <div className="ba-tour-body">
          <motion.div className="ba-tour-diagram"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}>
            <div className="ba-svg-container">
              <BanjoSVG highlights={new Set()} viewBox="0 0 600 920" />
            </div>
          </motion.div>

          <motion.div className="ba-start-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}>
            <h3 className="ba-step-title">Guided Banjo Tour</h3>
            <p className="ba-step-desc">
              A narrated walkthrough of every part of the 5-string banjo — with animations, zoom, and a British accent.
            </p>
            <motion.button
              className="btn btn-primary ba-start-btn"
              onClick={handleStart}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ▶ Start Tour
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="ba-tour">
      <motion.div className="ba-tour-header"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}>
        <button className="btn btn-sm settings-back-btn" onClick={onExit}>&larr; Back</button>
        <h2 className="ba-tour-heading">Banjo Anatomy</h2>
        <span className="ba-tour-progress">{segmentIndex + 1} / {SEGMENTS.length}</span>
      </motion.div>

      <div className="ba-tour-body">
        <motion.div className="ba-tour-diagram"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}>
          <div className="ba-svg-container">
            <BanjoSVG highlights={highlights} viewBox={segment.viewBox} />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={segment.id}
            className="ba-tour-content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22, mass: 0.8 }}
          >
            <motion.div className="ba-step-label"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              {segment.subtitle}
            </motion.div>
            <motion.h3 className="ba-step-title"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              {segment.title}
            </motion.h3>
            <motion.p className="ba-step-desc"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              {segment.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar + controls */}
      <div className="ba-progress-area">
        <div className="ba-progress-track" ref={progressRef} onClick={handleSeek}>
          <motion.div
            className="ba-progress-fill"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.1 }}
          />
          {SEGMENT_STARTS.slice(1).map((t, i) => (
            <div key={i} className="ba-progress-tick" style={{ left: `${(t / TOTAL_DURATION) * 100}%` }} />
          ))}
        </div>

        <div className="ba-controls">
          <motion.button
            className="btn btn-sm ba-play-btn"
            onClick={togglePlay}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {finished ? '↻ Replay' : playing ? '❚❚ Pause' : '▶ Play'}
          </motion.button>
          <motion.button
            className="btn btn-sm ba-mute-btn"
            onClick={narrator.toggleMute}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={narrator.muted ? 'Unmute narration (M)' : 'Mute narration (M)'}
          >
            {narrator.muted ? '🔇' : '🔊'}
          </motion.button>
          <span className="ba-time">
            {Math.floor(elapsed)}s / {Math.floor(TOTAL_DURATION)}s
          </span>
        </div>
      </div>
    </div>
  )
}

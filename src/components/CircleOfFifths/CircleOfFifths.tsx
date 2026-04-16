// ─── CircleOfFifths ─────────────────────────────────────────────────────────
// Interactive SVG-based Circle of Fifths for banjo key exploration.
// Self-contained: no external CSS or libraries required.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useSyncExternalStore } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CircleKey {
  major: string;
  minor: string;
  sharps: number;
  flats: number;
}

type Selection = { key: string; type: 'major' | 'minor' } | null;

// ─── Data ───────────────────────────────────────────────────────────────────

const CIRCLE_KEYS: CircleKey[] = [
  { major: 'C',  minor: 'Am',  sharps: 0, flats: 0 },
  { major: 'G',  minor: 'Em',  sharps: 1, flats: 0 },
  { major: 'D',  minor: 'Bm',  sharps: 2, flats: 0 },
  { major: 'A',  minor: 'F#m', sharps: 3, flats: 0 },
  { major: 'E',  minor: 'C#m', sharps: 4, flats: 0 },
  { major: 'B',  minor: 'G#m', sharps: 5, flats: 0 },
  { major: 'F#', minor: 'D#m', sharps: 6, flats: 6 },
  { major: 'Db', minor: 'Bbm', sharps: 0, flats: 5 },
  { major: 'Ab', minor: 'Fm',  sharps: 0, flats: 4 },
  { major: 'Eb', minor: 'Cm',  sharps: 0, flats: 3 },
  { major: 'Bb', minor: 'Gm',  sharps: 0, flats: 2 },
  { major: 'F',  minor: 'Dm',  sharps: 0, flats: 1 },
];

const BLUEGRASS_KEYS = new Set(['G', 'C', 'D', 'A', 'E', 'F']);

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Enharmonic mapping for flat keys so scale degrees display correctly
const ENHARMONIC_FLAT: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
const MINOR_QUALITIES = ['m', 'dim', '', 'm', 'm', '', ''];

// Minor scale intervals (natural minor)
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

// ─── SVG Geometry ───────────────────────────────────────────────────────────

const CX = 150;
const CY = 150;
const OUTER_R = 140;
const MID_R = 100;
const INNER_R = 60;
const SEGMENT_DEG = 30;
const START_OFFSET = -90 - 15; // C centered at 12 o'clock

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startDeg);
  const outerEnd = polarToCartesian(cx, cy, outerR, endDeg);
  const innerStart = polarToCartesian(cx, cy, innerR, startDeg);
  const innerEnd = polarToCartesian(cx, cy, innerR, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

// ─── Chord Computation ──────────────────────────────────────────────────────

function getScaleDegrees(root: string, intervals: number[], useFlats: boolean): string[] {
  // Find root in chromatic — handle enharmonics
  let idx = CHROMATIC.indexOf(root);
  if (idx === -1) {
    // Try finding via enharmonic (e.g., 'Db' -> find 'C#')
    const entry = Object.entries(ENHARMONIC_FLAT).find(([, v]) => v === root);
    if (entry) idx = CHROMATIC.indexOf(entry[0]);
  }
  if (idx === -1) idx = 0;

  return intervals.map((interval) => {
    const noteIdx = (idx + interval) % 12;
    const note = CHROMATIC[noteIdx];
    if (useFlats && ENHARMONIC_FLAT[note]) {
      return ENHARMONIC_FLAT[note];
    }
    return note;
  });
}

interface DiatonicChord {
  roman: string;
  name: string;
  isPrimary: boolean;
}

function getDiatonicChords(selection: Selection): DiatonicChord[] {
  if (!selection) return [];

  const circleEntry = CIRCLE_KEYS.find(
    (k) => (selection.type === 'major' ? k.major : k.minor) === selection.key,
  );
  const useFlats = circleEntry ? circleEntry.flats > 0 && circleEntry.sharps === 0 : false;

  if (selection.type === 'major') {
    const degrees = getScaleDegrees(selection.key, MAJOR_INTERVALS, useFlats);
    return degrees.map((note, i) => ({
      roman: ROMAN_MAJOR[i],
      name: note + MAJOR_QUALITIES[i],
      isPrimary: i === 0 || i === 3 || i === 4, // I, IV, V
    }));
  } else {
    // Minor key: strip 'm' suffix to get root
    const root = selection.key.replace('m', '');
    const degrees = getScaleDegrees(root, MINOR_INTERVALS, useFlats);
    return degrees.map((note, i) => ({
      roman: ROMAN_MINOR[i],
      name: note + MINOR_QUALITIES[i],
      isPrimary: i === 0 || i === 3 || i === 4, // i, iv, v
    }));
  }
}

function getSignatureText(selection: Selection): string {
  if (!selection) return '';
  const entry = CIRCLE_KEYS.find(
    (k) => (selection.type === 'major' ? k.major : k.minor) === selection.key,
  );
  if (!entry) return '';
  if (entry.sharps === 0 && entry.flats === 0) return 'No sharps or flats';
  if (entry.sharps > 0 && entry.flats > 0)
    return `${entry.sharps}\u266F / ${entry.flats}\u266D`; // F#/Gb enharmonic
  if (entry.sharps > 0) return `${entry.sharps} sharp${entry.sharps > 1 ? 's' : ''}`;
  return `${entry.flats} flat${entry.flats > 1 ? 's' : ''}`;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none' as const,
  },
  svg: {
    maxWidth: '100%',
    overflow: 'visible' as const,
  },
  chordsRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    maxWidth: '340px',
  },
};

// ─── Theme palette ──────────────────────────────────────────────────────────

function useIsLight() {
  return useSyncExternalStore(
    (cb) => {
      const obs = new MutationObserver(cb);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => obs.disconnect();
    },
    () => document.documentElement.getAttribute('data-theme') === 'light',
  );
}

const PALETTE = {
  dark: {
    segFill: 'rgba(255,255,255,0.08)',
    segHover: 'rgba(255,255,255,0.15)',
    segStroke: 'rgba(255,255,255,0.12)',
    innerFill: 'rgba(255,255,255,0.05)',
    innerHover: 'rgba(255,255,255,0.12)',
    innerStroke: 'rgba(255,255,255,0.08)',
    centerFill: 'rgba(0,0,0,0.3)',
    textNormal: '#e0e0e0',
    textMuted: 'rgba(255,255,255,0.5)',
    textPlaceholder: 'rgba(255,255,255,0.35)',
    badgeBg: 'rgba(255,255,255,0.06)',
    badgeBorder: 'rgba(255,255,255,0.08)',
    chordText: '#e0e0e0',
    chordRoman: 'rgba(255,255,255,0.4)',
  },
  light: {
    segFill: 'rgba(0,0,0,0.06)',
    segHover: 'rgba(0,0,0,0.12)',
    segStroke: 'rgba(0,0,0,0.15)',
    innerFill: 'rgba(0,0,0,0.04)',
    innerHover: 'rgba(0,0,0,0.10)',
    innerStroke: 'rgba(0,0,0,0.10)',
    centerFill: 'rgba(0,0,0,0.06)',
    textNormal: '#333',
    textMuted: 'rgba(0,0,0,0.5)',
    textPlaceholder: 'rgba(0,0,0,0.3)',
    badgeBg: 'rgba(0,0,0,0.05)',
    badgeBorder: 'rgba(0,0,0,0.10)',
    chordText: '#333',
    chordRoman: 'rgba(0,0,0,0.45)',
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function CircleOfFifths() {
  const [selection, setSelection] = useState<Selection>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const isLight = useIsLight();
  const p = isLight ? PALETTE.light : PALETTE.dark;

  const diatonicChords = getDiatonicChords(selection);

  function handleSelect(key: string, type: 'major' | 'minor') {
    if (selection?.key === key && selection?.type === type) {
      setSelection(null);
    } else {
      setSelection({ key, type });
    }
  }

  return (
    <div className="circle-of-fifths" style={styles.container}>
      <svg
        viewBox="0 0 300 300"
        width="300"
        height="300"
        style={styles.svg}
      >
        {/* Outer ring — Major keys */}
        {CIRCLE_KEYS.map((entry, i) => {
          const startAngle = START_OFFSET + i * SEGMENT_DEG;
          const endAngle = startAngle + SEGMENT_DEG;
          const midAngle = startAngle + SEGMENT_DEG / 2;
          const isSelected = selection?.key === entry.major && selection?.type === 'major';
          const isHovered = hovered === `major-${i}`;
          const isBluegrass = BLUEGRASS_KEYS.has(entry.major);

          const labelPos = polarToCartesian(CX, CY, (OUTER_R + MID_R) / 2, midAngle);
          const dotPos = polarToCartesian(CX, CY, OUTER_R - 10, midAngle);

          let fill = p.segFill;
          if (isSelected) fill = 'rgba(74,158,255,0.3)';
          else if (isHovered) fill = p.segHover;

          return (
            <g key={`major-${i}`}>
              <path
                d={describeArc(CX, CY, MID_R, OUTER_R, startAngle, endAngle)}
                fill={fill}
                stroke={isSelected ? '#4a9eff' : p.segStroke}
                strokeWidth={isSelected ? 1.5 : 0.5}
                style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
                onMouseEnter={() => setHovered(`major-${i}`)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSelect(entry.major, 'major')}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isSelected ? (isLight ? '#1a5cbf' : '#fff') : p.textNormal}
                fontSize={isSelected ? 13 : 12}
                fontWeight={isSelected ? 700 : 500}
                fontFamily="inherit"
                style={{ pointerEvents: 'none' }}
              >
                {entry.major}
              </text>
              {isBluegrass && (
                <circle
                  cx={dotPos.x}
                  cy={dotPos.y}
                  r={2.5}
                  fill="#ffa726"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          );
        })}

        {/* Inner ring — Minor keys */}
        {CIRCLE_KEYS.map((entry, i) => {
          const startAngle = START_OFFSET + i * SEGMENT_DEG;
          const endAngle = startAngle + SEGMENT_DEG;
          const midAngle = startAngle + SEGMENT_DEG / 2;
          const isSelected = selection?.key === entry.minor && selection?.type === 'minor';
          const isHovered = hovered === `minor-${i}`;

          const labelPos = polarToCartesian(CX, CY, (MID_R + INNER_R) / 2, midAngle);

          let fill = p.innerFill;
          if (isSelected) fill = 'rgba(74,222,128,0.25)';
          else if (isHovered) fill = p.innerHover;

          return (
            <g key={`minor-${i}`}>
              <path
                d={describeArc(CX, CY, INNER_R, MID_R, startAngle, endAngle)}
                fill={fill}
                stroke={isSelected ? '#4ade80' : p.innerStroke}
                strokeWidth={isSelected ? 1.5 : 0.5}
                style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
                onMouseEnter={() => setHovered(`minor-${i}`)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSelect(entry.minor, 'minor')}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isSelected ? (isLight ? '#157a3e' : '#fff') : p.textNormal}
                fontSize={isSelected ? 11 : 10}
                fontWeight={isSelected ? 700 : 400}
                fontFamily="inherit"
                style={{ pointerEvents: 'none' }}
              >
                {entry.minor}
              </text>
            </g>
          );
        })}

        {/* Center display */}
        <circle cx={CX} cy={CY} r={INNER_R} fill={p.centerFill} />
        {selection ? (
          <>
            <text
              x={CX}
              y={CY - 8}
              textAnchor="middle"
              dominantBaseline="central"
              fill={p.textNormal}
              fontSize={24}
              fontWeight={700}
              fontFamily="inherit"
            >
              {selection.key.endsWith('m')
                ? `${selection.key.slice(0, -1)} minor`
                : `${selection.key} major`}
            </text>
            <text
              x={CX}
              y={CY + 16}
              textAnchor="middle"
              dominantBaseline="central"
              fill={p.textMuted}
              fontSize={11}
              fontFamily="inherit"
            >
              {getSignatureText(selection)}
            </text>
          </>
        ) : (
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            dominantBaseline="central"
            fill={p.textPlaceholder}
            fontSize={12}
            fontFamily="inherit"
          >
            Select a key
          </text>
        )}
      </svg>

      {/* Diatonic chords row */}
      {diatonicChords.length > 0 && (
        <div style={styles.chordsRow}>
          {diatonicChords.map((chord) => (
            <div key={chord.roman} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '6px 10px', borderRadius: '8px', minWidth: '38px',
              background: chord.isPrimary ? 'rgba(74,158,255,0.15)' : p.badgeBg,
              border: chord.isPrimary ? '1px solid rgba(74,158,255,0.35)' : `1px solid ${p.badgeBorder}`,
            }}>
              <span style={{ fontSize: '13px', fontWeight: chord.isPrimary ? 700 : 500, color: chord.isPrimary ? '#4a9eff' : p.chordText, lineHeight: 1.2 }}>{chord.name}</span>
              <span style={{ fontSize: '10px', color: chord.isPrimary ? 'rgba(74,158,255,0.7)' : p.chordRoman, lineHeight: 1.2, marginTop: '2px' }}>{chord.roman}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

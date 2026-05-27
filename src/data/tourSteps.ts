// ─── Site Tour Step Definitions ──────────────────────────────────────────────

import type { Page, ToolModal } from '../store/useStore'

export interface TourStep {
  target: string           // data-tour attribute value to find the element
  title: string
  body: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  section: string          // section label for grouped progress indicator
  navigateTo?: Page        // page to navigate to before showing step
  openModal?: ToolModal    // modal to open before showing step
  closeModal?: boolean     // close any open modal before this step
}

// ─── Student Tour ────────────────────────────────────────────────────────────

export const STUDENT_TOUR: TourStep[] = [
  // ── Home ──
  {
    target: 'home-streak',
    title: 'Practice Streak',
    body: 'Your current streak and last practice date. Consistency is key to mastering banjo — try to practice a little every day!',
    placement: 'bottom',
    section: 'Home',
  },
  {
    target: 'home-continue',
    title: 'Continue Practicing',
    body: 'Jump right back to where you left off. This card shows your most recently practiced skill and current status.',
    placement: 'bottom',
    section: 'Home',
  },
  {
    target: 'home-progress',
    title: 'Your Progress',
    body: 'The progress ring tracks how far you\'ve come. Below it you\'ll see counts of completed, active, and locked skills.',
    placement: 'top',
    section: 'Home',
  },
  {
    target: 'home-cards',
    title: 'Section Cards',
    body: 'Each card is a section of the app — Pathway, Skills, Progress, Awards, Settings, and Tools. Click any card to dive in. On mobile, use the bottom tab bar for quick navigation.',
    placement: 'left',
    section: 'Home',
  },

  // ── Skills ──
  {
    target: 'skill-tree-main',
    title: 'Skill Cards & Practice',
    body: 'Click a category to see skill cards with status, BPM, and mastery info. Select any unlocked skill to practice with real-time audio detection.',
    placement: 'left',
    section: 'Skills',
  },

  // ── Progress ──
  {
    target: 'progress-heatmap',
    title: 'Activity Map',
    body: 'A full year of practice at a glance. Darker squares mean more practice that day. Build your streak!',
    placement: 'bottom',
    section: 'Progress',
  },
  {
    target: 'progress-bpm',
    title: 'BPM Trends',
    body: 'Pick a skill to see how your speed has improved over time. The chart plots your best BPM from each session.',
    placement: 'top',
    section: 'Progress',
  },

  // ── Tools ──
  {
    target: 'metronome',
    title: 'Metronome',
    body: 'A full metronome available anytime — even during practice. Set BPM, choose a time signature, or tap out a tempo.',
    placement: 'top',
    section: 'Tools',
    openModal: 'metronome',
  },
  {
    target: 'tuner',
    title: 'Tuner',
    body: 'Tune your banjo with your microphone. The gauge shows sharp/flat in real time, and each string gets a checkmark when in tune.',
    placement: 'top',
    section: 'Tools',
    openModal: 'tuner',
  },
]

// ─── Teacher Tour ────────────────────────────────────────────────────────────

export const TEACHER_TOUR: TourStep[] = [
  // ── Home ──
  {
    target: 'home-cards',
    title: 'Section Cards',
    body: 'Navigate through these cards, or use the bottom tab bar on mobile. As a teacher, all skills are unlocked — no prerequisites needed.',
    placement: 'left',
    section: 'Home',
  },

  // ── Skills ──
  {
    target: 'skill-tree-main',
    title: 'Practice & Teaching',
    body: 'Select a skill card to see the practice view with audio detection. As a teacher, you also get media upload controls and can reorder teaching materials.',
    placement: 'left',
    section: 'Skills',
  },

  // ── Tools ──
  {
    target: 'metronome',
    title: 'Metronome',
    body: 'Built-in metronome with tap tempo, time signatures, and presets. Available during lessons — no separate app needed.',
    placement: 'top',
    section: 'Tools',
    openModal: 'metronome',
  },
  {
    target: 'tuner',
    title: 'Tuner',
    body: 'Chromatic tuner with string-by-string lockout. Have students tune up before each lesson.',
    placement: 'top',
    section: 'Tools',
    openModal: 'tuner',
  },

  // ── Settings ──
  {
    target: 'settings-page',
    title: 'Settings & Teacher Tools',
    body: 'Your command center for managing the curriculum, students, and teaching media.',
    placement: 'bottom',
    section: 'Settings',
    navigateTo: 'settings',
    closeModal: true,
  },
  {
    target: 'settings-teacher',
    title: 'Teacher Tools',
    body: 'Edit curriculum order, manage your student roster, and control which skills students can access.',
    placement: 'bottom',
    section: 'Settings',
  },
  {
    target: 'settings-media',
    title: 'Teaching Media',
    body: 'Record demo videos, audio explanations, upload reference images, and tablature. Students see these during practice.',
    placement: 'bottom',
    section: 'Settings',
  },
]

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
    target: 'home-logo',
    title: 'Welcome to Banjo Buddy!',
    body: 'This is your home base for learning Scruggs-style banjo. Let\'s take a quick tour of everything the app has to offer.',
    placement: 'bottom',
    section: 'Home',
    navigateTo: 'dashboard',
    closeModal: true,
  },
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

  // ── Pathway ──
  {
    target: 'pathway-sidebar',
    title: 'Your Pathway',
    body: 'The Pathway shows every skill in your learning path in order. It\'s a road map from your first roll to full songs.',
    placement: 'right',
    section: 'Pathway',
    navigateTo: 'pathway',
    closeModal: true,
  },

  // ── Skills ──
  {
    target: 'skill-tree-sidebar',
    title: 'Skill Categories',
    body: 'Browse skills organized into collectible card categories — Rolls, Techniques, Licks, Songs, and more. Expand the sidebar for a full skill list.',
    placement: 'right',
    section: 'Skills',
    navigateTo: 'skill-tree',
    closeModal: true,
  },
  {
    target: 'skill-tree-main',
    title: 'Skill Cards & Practice',
    body: 'Click a category to see skill cards with status, BPM, and mastery info. Select any unlocked skill to practice with real-time audio detection.',
    placement: 'left',
    section: 'Skills',
  },

  // ── Progress ──
  {
    target: 'progress-stats',
    title: 'Your Stats',
    body: 'A snapshot of your practice — total sessions, time spent, skills mastered, and your best streak.',
    placement: 'bottom',
    section: 'Progress',
    navigateTo: 'progress',
    closeModal: true,
  },
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

  // ── Achievements ──
  {
    target: 'achievements-page',
    title: 'Awards',
    body: 'Earn badges for milestones — practice streaks, speed records, skills mastered. Gold means earned, outlined means still to unlock.',
    placement: 'bottom',
    section: 'Awards',
    navigateTo: 'achievements',
    closeModal: true,
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

  // ── Profile ──
  {
    target: 'user-badge',
    title: 'Your Profile',
    body: 'Click your avatar to access your profile, change themes, switch between student and teacher mode, or sign out.',
    placement: 'bottom',
    section: 'Profile',
    closeModal: true,
    navigateTo: 'dashboard',
  },
]

// ─── Teacher Tour ────────────────────────────────────────────────────────────

export const TEACHER_TOUR: TourStep[] = [
  // ── Home ──
  {
    target: 'home-logo',
    title: 'Teacher Dashboard',
    body: 'Welcome! As a teacher you see the same home screen as students, plus extra tools throughout the app for managing curriculum and media.',
    placement: 'bottom',
    section: 'Home',
    navigateTo: 'dashboard',
    closeModal: true,
  },
  {
    target: 'home-cards',
    title: 'Section Cards',
    body: 'Navigate through these cards, or use the bottom tab bar on mobile. As a teacher, all skills are unlocked — no prerequisites needed.',
    placement: 'left',
    section: 'Home',
  },

  // ── Skills ──
  {
    target: 'skill-tree-sidebar',
    title: 'Skill Categories',
    body: 'Browse skills as collectible cards organized by category. Expand the sidebar to see all skills. Select any skill to add demo videos, audio, images, or tablature.',
    placement: 'right',
    section: 'Skills',
    navigateTo: 'skill-tree',
    closeModal: true,
  },
  {
    target: 'skill-tree-main',
    title: 'Practice & Teaching',
    body: 'Select a skill card to see the practice view with audio detection. As a teacher, you also get media upload controls and can reorder teaching materials.',
    placement: 'left',
    section: 'Skills',
  },

  // ── Progress ──
  {
    target: 'progress-stats',
    title: 'Progress Stats',
    body: 'View your own practice statistics. Use this to stay sharp or demo skills for students.',
    placement: 'bottom',
    section: 'Progress',
    navigateTo: 'progress',
    closeModal: true,
  },

  // ── Awards ──
  {
    target: 'achievements-page',
    title: 'Awards',
    body: 'Students earn badges automatically. Use them as motivation — "Can you unlock the 7-day streak badge this week?"',
    placement: 'bottom',
    section: 'Awards',
    navigateTo: 'achievements',
    closeModal: true,
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

  // ── Profile ──
  {
    target: 'user-badge',
    title: 'Your Profile',
    body: 'Access your profile, switch themes, toggle between teacher and student mode in Settings, or sign out. Happy teaching!',
    placement: 'bottom',
    section: 'Profile',
    closeModal: true,
    navigateTo: 'dashboard',
  },
]

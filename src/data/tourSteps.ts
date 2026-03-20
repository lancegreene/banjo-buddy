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
  // ── Dashboard ──
  {
    target: 'dashboard',
    title: 'Welcome Home',
    body: 'This is your home base. It shows your current skill, practice streak, and a quick-start button to jump right back into practice.',
    placement: 'bottom',
    section: 'Dashboard',
    navigateTo: 'dashboard',
    closeModal: true,
  },
  {
    target: 'progress-overview',
    title: 'Overall Progress',
    body: 'This ring tracks how far you\'ve come across all skills in your learning path. Watch it fill up as you master new techniques!',
    placement: 'bottom',
    section: 'Dashboard',
  },
  {
    target: 'dashboard-heatmap',
    title: 'Practice Activity',
    body: 'Like a GitHub commit graph but for banjo! Each square represents a day — darker means more practice time. Build that streak!',
    placement: 'bottom',
    section: 'Dashboard',
  },
  {
    target: 'warmup-card',
    title: 'Quick Warm-Up',
    body: 'Hit "Generate" to get a 5-minute warm-up routine tailored to skills you\'ve already unlocked. Great way to start each session.',
    placement: 'bottom',
    section: 'Dashboard',
  },
  {
    target: 'todays-plan',
    title: 'Today\'s Plan',
    body: 'Your AI-generated practice plan for today. It balances new skills, active work, and maintenance of things you\'ve already learned.',
    placement: 'bottom',
    section: 'Dashboard',
  },
  {
    target: 'path-selector',
    title: 'Learning Path',
    body: 'Choose your difficulty level. "Newby" starts from absolute basics, "Beginner" assumes some familiarity, and "Intermediate" jumps to advanced rolls and licks.',
    placement: 'right',
    section: 'Dashboard',
  },

  // ── Pathway ──
  {
    target: 'pathway-sidebar',
    title: 'Your Pathway',
    body: 'The Pathway shows every skill in your learning path in order, month by month. It\'s like a road map for your banjo journey.',
    placement: 'right',
    section: 'Pathway',
    navigateTo: 'pathway',
    closeModal: true,
  },
  {
    target: 'pathway-timeline',
    title: 'Timeline View',
    body: 'Skills are organized by month. Green dots mean completed, orange means in progress, and gray means locked. Click any unlocked skill to start practicing!',
    placement: 'right',
    section: 'Pathway',
  },

  // ── Skills ──
  {
    target: 'skill-tree-sidebar',
    title: 'Skill Tree',
    body: 'All your skills organized by category — Rolls, Techniques, Licks, and Songs. Expand any category to see what\'s inside.',
    placement: 'right',
    section: 'Skills',
    navigateTo: 'skill-tree',
    closeModal: true,
  },
  {
    target: 'skill-category-first',
    title: 'Skill Categories',
    body: 'Click a category header to expand or collapse it. Each skill card shows its status: locked, unlocked, in progress, or mastered.',
    placement: 'right',
    section: 'Skills',
  },
  {
    target: 'skill-tree-main',
    title: 'Practice Area',
    body: 'When you select a skill, this is where the magic happens. You\'ll see the exercise, BPM controls, audio detection, and your roll feedback — all in real time.',
    placement: 'left',
    section: 'Skills',
  },

  // ── Progress ──
  {
    target: 'progress-stats',
    title: 'Your Stats',
    body: 'A snapshot of your overall practice — total sessions, time spent, skills mastered, and your best streak.',
    placement: 'bottom',
    section: 'Progress',
    navigateTo: 'progress',
    closeModal: true,
  },
  {
    target: 'progress-heatmap',
    title: 'Full Activity Map',
    body: 'A full year of practice activity at a glance. Hover over any day to see exactly how many minutes you practiced.',
    placement: 'bottom',
    section: 'Progress',
  },
  {
    target: 'progress-bpm',
    title: 'BPM Trends',
    body: 'Pick a skill and see how your speed has improved over time. The chart plots your best BPM from each session.',
    placement: 'top',
    section: 'Progress',
  },
  {
    target: 'progress-history',
    title: 'Session History',
    body: 'A log of every practice session — what you worked on, how long, and what BPM you reached. Great for looking back at your journey.',
    placement: 'top',
    section: 'Progress',
  },

  // ── Achievements ──
  {
    target: 'achievements-page',
    title: 'Achievements',
    body: 'Earn badges as you hit milestones — practice streaks, speed records, skills mastered, and more. Gold stars mean earned, outlines mean still to unlock.',
    placement: 'bottom',
    section: 'Awards',
    navigateTo: 'achievements',
    closeModal: true,
  },

  // ── Metronome ──
  {
    target: 'metronome',
    title: 'Built-In Metronome',
    body: 'A full metronome you can open anytime — even while practicing. Set your BPM, choose a time signature, or use tap tempo to match a song.',
    placement: 'top',
    section: 'Tools',
    openModal: 'metronome',
  },
  {
    target: 'metro-controls',
    title: 'Metronome Controls',
    body: 'Use +/- buttons or the slider to set BPM. The "TAP" button lets you tap out a tempo. Quick presets are at the bottom for common speeds.',
    placement: 'top',
    section: 'Tools',
  },

  // ── Tuner ──
  {
    target: 'tuner',
    title: 'Chromatic Tuner',
    body: 'Tune your banjo using your microphone. The gauge shows sharp/flat in real time, and each string locks in with a green checkmark when it\'s in tune.',
    placement: 'top',
    section: 'Tools',
    openModal: 'tuner',
  },
  {
    target: 'tuner-strings',
    title: 'String Reference',
    body: 'All 5 open strings shown at the top. As you tune each one, it gets a checkmark. When all 5 are green, you\'re ready to play!',
    placement: 'bottom',
    section: 'Tools',
  },

  // ── Settings ──
  {
    target: 'settings-page',
    title: 'Settings',
    body: 'Change your learning path, retake this tour, and manage custom roll patterns.',
    placement: 'bottom',
    section: 'Settings',
    navigateTo: 'settings',
    closeModal: true,
  },
  {
    target: 'settings-patterns',
    title: 'Custom Roll Patterns',
    body: 'Create your own roll patterns and they\'ll appear alongside the built-in ones everywhere in the app. Great for practicing patterns from your favorite songs.',
    placement: 'top',
    section: 'Settings',
  },

  // ── Account ──
  {
    target: 'user-badge',
    title: 'Your Account',
    body: 'Click your avatar to switch users, toggle dark/light theme, or log out. You\'re all set — go pick something and start picking!',
    placement: 'bottom',
    section: 'Account',
    closeModal: true,
    navigateTo: 'dashboard',
  },
]

// ─── Teacher Tour ────────────────────────────────────────────────────────────

export const TEACHER_TOUR: TourStep[] = [
  // ── Dashboard ──
  {
    target: 'dashboard',
    title: 'Teacher Dashboard',
    body: 'Welcome! As a teacher, you see the same dashboard as students plus extra controls throughout the app. Let\'s take a look.',
    placement: 'bottom',
    section: 'Dashboard',
    navigateTo: 'dashboard',
    closeModal: true,
  },
  {
    target: 'progress-overview',
    title: 'Progress Ring',
    body: 'This tracks overall curriculum completion. As a teacher, all skills are unlocked for you — no prerequisites needed.',
    placement: 'bottom',
    section: 'Dashboard',
  },
  {
    target: 'todays-plan',
    title: 'Practice Plan',
    body: 'The AI-generated daily plan works for teachers too. Use it to stay sharp or demo skills for students.',
    placement: 'bottom',
    section: 'Dashboard',
  },

  // ── Pathway ──
  {
    target: 'pathway-sidebar',
    title: 'Learning Pathway',
    body: 'The pathway shows skills in curriculum order. As a teacher, everything is accessible — students will see locked skills until they meet prerequisites.',
    placement: 'right',
    section: 'Pathway',
    navigateTo: 'pathway',
    closeModal: true,
  },

  // ── Skills ──
  {
    target: 'skill-tree-sidebar',
    title: 'Skill Tree',
    body: 'Browse all skills by category. When you select a skill, you\'ll see teacher tools to add demo videos, audio, images, and tablature.',
    placement: 'right',
    section: 'Skills',
    navigateTo: 'skill-tree',
    closeModal: true,
  },
  {
    target: 'skill-tree-main',
    title: 'Practice & Teaching Area',
    body: 'Select a skill and you\'ll see the practice view with audio detection. As a teacher, you\'ll also see media upload controls and can reorder teaching materials.',
    placement: 'left',
    section: 'Skills',
  },

  // ── Progress ──
  {
    target: 'progress-stats',
    title: 'Progress Stats',
    body: 'View your own practice statistics. In the future, you\'ll be able to view individual student progress here as well.',
    placement: 'bottom',
    section: 'Progress',
    navigateTo: 'progress',
    closeModal: true,
  },
  {
    target: 'progress-heatmap',
    title: 'Activity Heatmap',
    body: 'A full year of practice data visualized. Encourage students to build daily streaks — consistency is key to mastering Scruggs style.',
    placement: 'bottom',
    section: 'Progress',
  },

  // ── Achievements ──
  {
    target: 'achievements-page',
    title: 'Achievements',
    body: 'Students earn these badges automatically. Use them as motivation — "Can you unlock the 7-day streak badge this week?"',
    placement: 'bottom',
    section: 'Awards',
    navigateTo: 'achievements',
    closeModal: true,
  },

  // ── Tools ──
  {
    target: 'metronome',
    title: 'Metronome',
    body: 'Built-in metronome with tap tempo, time signatures, and BPM presets. Available during lessons — no separate app needed.',
    placement: 'top',
    section: 'Tools',
    openModal: 'metronome',
  },
  {
    target: 'tuner',
    title: 'Tuner',
    body: 'Chromatic tuner with string-by-string lockout. Have students tune up before each lesson — the app will confirm when all 5 strings are good.',
    placement: 'top',
    section: 'Tools',
    openModal: 'tuner',
  },

  // ── Settings (Teacher-specific deep dive) ──
  {
    target: 'settings-page',
    title: 'Settings & Teacher Tools',
    body: 'This is your command center. Let\'s look at each teacher-specific tool.',
    placement: 'bottom',
    section: 'Settings',
    navigateTo: 'settings',
    closeModal: true,
  },
  {
    target: 'settings-teacher',
    title: 'Teacher Tools',
    body: 'Edit the curriculum order, manage your student roster, and control which skills students can see. The "Edit Curriculum" button opens a drag-and-drop editor.',
    placement: 'bottom',
    section: 'Settings',
  },
  {
    target: 'settings-media',
    title: 'Teaching Media',
    body: 'Record demo videos, audio explanations, upload reference images, and add tablature. Students see these materials when they open a skill for practice.',
    placement: 'bottom',
    section: 'Settings',
  },
  {
    target: 'settings-patterns',
    title: 'Custom Roll Patterns',
    body: 'Create custom roll patterns that appear alongside the built-in ones. Students can practice these just like the standard forward roll, backward roll, etc.',
    placement: 'top',
    section: 'Settings',
  },

  // ── Account ──
  {
    target: 'user-badge',
    title: 'Your Account',
    body: 'Switch between teacher and student views to see exactly what your students experience. Toggle themes or manage accounts from here. Happy teaching!',
    placement: 'bottom',
    section: 'Account',
    closeModal: true,
    navigateTo: 'dashboard',
  },
]

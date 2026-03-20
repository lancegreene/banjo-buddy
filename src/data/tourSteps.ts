// ─── Site Tour Step Definitions ──────────────────────────────────────────────

export interface TourStep {
  target: string           // data-tour attribute value to find the element
  title: string
  body: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  navigateTo?: string      // optional page to navigate to before showing step
}

export const STUDENT_TOUR: TourStep[] = [
  {
    target: 'dashboard',
    title: 'Your Dashboard',
    body: 'This is your home base. You\'ll see your current skill, practice streaks, and a quick-start button to jump into your next session.',
    placement: 'bottom',
  },
  {
    target: 'nav-pathway',
    title: 'Learning Pathway',
    body: 'Follow a structured path from beginner to advanced. Each step builds on the last so you never feel lost.',
    placement: 'top',
  },
  {
    target: 'nav-skills',
    title: 'Skill Tree',
    body: 'See every skill at a glance. Locked skills unlock as you master their prerequisites. Tap any skill to start practicing.',
    placement: 'top',
  },
  {
    target: 'nav-progress',
    title: 'Progress & Stats',
    body: 'Track your practice streaks, session history, and see how your speed and accuracy improve over time.',
    placement: 'top',
  },
  {
    target: 'nav-awards',
    title: 'Achievements',
    body: 'Earn badges and awards as you hit milestones. Every streak, mastery, and first try counts!',
    placement: 'top',
  },
  {
    target: 'nav-metro',
    title: 'Metronome',
    body: 'A built-in metronome you can open anytime — even while practicing a skill.',
    placement: 'top',
  },
  {
    target: 'nav-tuner',
    title: 'Tuner',
    body: 'Tune your banjo using your microphone. It listens for each string and shows you if you\'re sharp or flat.',
    placement: 'top',
  },
  {
    target: 'nav-settings',
    title: 'Settings',
    body: 'Change your learning path, adjust preferences, and customize your experience.',
    placement: 'top',
  },
  {
    target: 'user-badge',
    title: 'Your Account',
    body: 'Switch users, toggle dark/light theme, or log out from here.',
    placement: 'bottom',
  },
]

export const TEACHER_TOUR: TourStep[] = [
  {
    target: 'dashboard',
    title: 'Teacher Dashboard',
    body: 'Welcome, teacher! This is your home base. You\'ll see the same practice tools as students, plus teacher controls throughout the app.',
    placement: 'bottom',
  },
  {
    target: 'nav-pathway',
    title: 'Learning Pathway',
    body: 'The pathway shows skills in curriculum order. As a teacher, all skills are unlocked for you — no prerequisites needed.',
    placement: 'top',
  },
  {
    target: 'nav-skills',
    title: 'Skill Tree',
    body: 'Browse all skills. When you open a skill, you\'ll see teacher tools to record videos, audio, upload images, and tablature for your students.',
    placement: 'top',
  },
  {
    target: 'nav-progress',
    title: 'Progress Tracking',
    body: 'Monitor practice stats. In future updates, you\'ll be able to view student progress here too.',
    placement: 'top',
  },
  {
    target: 'nav-awards',
    title: 'Achievements',
    body: 'Students earn these as they hit milestones. Check what\'s available to motivate your learners.',
    placement: 'top',
  },
  {
    target: 'nav-metro',
    title: 'Metronome',
    body: 'Built-in metronome — available anytime, even during practice sessions.',
    placement: 'top',
  },
  {
    target: 'nav-tuner',
    title: 'Tuner',
    body: 'Chromatic tuner using the microphone. Great for in-lesson tuning checks.',
    placement: 'top',
  },
  {
    target: 'nav-settings',
    title: 'Settings & Teaching Tools',
    body: 'This is where the magic happens. Edit the curriculum, manage students, create custom roll patterns, and upload teaching media.',
    placement: 'top',
  },
  {
    target: 'user-badge',
    title: 'Your Account',
    body: 'Switch between teacher and student views, toggle themes, or manage accounts.',
    placement: 'bottom',
  },
]

// ─── SiteTour — Spotlight overlay tour for new users ─────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { STUDENT_TOUR, TEACHER_TOUR, type TourStep } from '../../data/tourSteps'
import { useStore } from '../../store/useStore'

const PADDING = 8  // px around the spotlight target
const TOOLTIP_GAP = 12 // px between spotlight and tooltip

interface Rect {
  top: number; left: number; width: number; height: number
}

/** Extract unique ordered section names from steps */
function getSections(steps: TourStep[]): string[] {
  const seen = new Set<string>()
  const sections: string[] = []
  for (const s of steps) {
    if (!seen.has(s.section)) {
      seen.add(s.section)
      sections.push(s.section)
    }
  }
  return sections
}

export function SiteTour() {
  const tourActive = useStore((s) => s.tourActive)
  const tourStep = useStore((s) => s.tourStep)
  const advanceTour = useStore((s) => s.advanceTour)
  const dismissTour = useStore((s) => s.dismissTour)
  const activeUserRole = useStore((s) => s.activeUserRole)
  const setPage = useStore((s) => s.setPage)
  const setOpenModal = useStore((s) => s.setOpenModal)

  const steps: TourStep[] = activeUserRole === 'teacher' ? TEACHER_TOUR : STUDENT_TOUR
  const step = steps[tourStep]
  const isLast = tourStep === steps.length - 1

  const sections = getSections(steps)
  const currentSection = step?.section ?? ''
  const currentSectionIdx = sections.indexOf(currentSection)

  const [rect, setRect] = useState<Rect | null>(null)
  const prevStepRef = useRef(tourStep)

  // Navigate to the right page/modal when step changes
  useEffect(() => {
    if (!tourActive || !step) return

    // Close modal if requested
    if (step.closeModal) {
      setOpenModal(null)
    }

    // Navigate to page if specified
    if (step.navigateTo) {
      setPage(step.navigateTo)
    }

    // Open modal if specified (after a small delay to let page render)
    if (step.openModal) {
      const timer = setTimeout(() => setOpenModal(step.openModal!), 50)
      return () => clearTimeout(timer)
    }
  }, [tourActive, tourStep]) // eslint-disable-line react-hooks/exhaustive-deps

  // Find, scroll into view, and measure the target element
  const measure = useCallback(() => {
    if (!step) return
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (!el) { setRect(null); return }

    // Scroll element into view if it's not visible
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    if (r.top < 0 || r.bottom > vh) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Re-measure after scroll settles
      setTimeout(() => {
        const r2 = el.getBoundingClientRect()
        setRect({
          top: r2.top - PADDING,
          left: r2.left - PADDING,
          width: r2.width + PADDING * 2,
          // Cap spotlight height so it doesn't extend beyond viewport
          height: Math.min(r2.height + PADDING * 2, vh - 32),
        })
      }, 350)
      return
    }

    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: Math.min(r.height + PADDING * 2, vh - 32),
    })
  }, [step])

  // Re-measure on step change and window resize
  useEffect(() => {
    if (!tourActive) return
    // Longer delay after navigation to allow DOM to settle
    const delay = step?.navigateTo || step?.openModal || step?.closeModal ? 300 : 100
    const timer = setTimeout(measure, delay)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [tourActive, tourStep, measure])

  // Track previous step for animation direction
  useEffect(() => {
    prevStepRef.current = tourStep
  }, [tourStep])

  if (!tourActive || !step) return null

  function handleDismiss() {
    setOpenModal(null)
    dismissTour()
  }

  // Tooltip position
  const tooltip = computeTooltipPosition(rect, step.placement)

  return (
    <div className="tour-overlay">
      {/* Dark backdrop with cutout */}
      {rect && (
        <svg className="tour-backdrop-svg" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`} preserveAspectRatio="none">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0" y="0"
            width="100%" height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#tour-mask)"
          />
        </svg>
      )}

      {/* Spotlight border ring */}
      {rect && (
        <div
          className="tour-spotlight-ring"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tourStep}
          className={`tour-tooltip tour-tooltip-${step.placement}`}
          style={tooltip}
          initial={{ opacity: 0, y: step.placement === 'top' ? 10 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Section label */}
          <div className="tour-section-label">{step.section}</div>

          <div className="tour-tooltip-header">
            <span className="tour-tooltip-title">{step.title}</span>
            <span className="tour-tooltip-counter">{tourStep + 1} / {steps.length}</span>
          </div>
          <p className="tour-tooltip-body">{step.body}</p>
          <div className="tour-tooltip-footer">
            <button className="tour-btn-skip" onClick={handleDismiss}>
              {isLast ? 'Done' : 'Skip Tour'}
            </button>
            {!isLast && (
              <button className="tour-btn-next" onClick={advanceTour}>
                Next
              </button>
            )}
            {isLast && (
              <button className="tour-btn-next" onClick={handleDismiss}>
                Get Started!
              </button>
            )}
          </div>

          {/* Section progress dots */}
          <div className="tour-section-dots">
            {sections.map((sec, i) => (
              <div
                key={sec}
                className={`tour-section-dot ${
                  i === currentSectionIdx ? 'tour-section-dot-active' :
                  i < currentSectionIdx ? 'tour-section-dot-done' : ''
                }`}
                title={sec}
              >
                <span className="tour-section-dot-label">{sec}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function computeTooltipPosition(
  rect: Rect | null,
  placement: TourStep['placement']
): React.CSSProperties {
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  const style: React.CSSProperties = { position: 'fixed' }
  const tooltipMaxW = 320
  const tooltipEstH = 200 // estimated tooltip height for overflow checks
  const margin = 16
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Determine effective placement — flip if tooltip would overflow viewport
  let effective = placement
  if (effective === 'bottom' && rect.top + rect.height + TOOLTIP_GAP + tooltipEstH > vh) {
    effective = rect.top - TOOLTIP_GAP - tooltipEstH > 0 ? 'top' : 'bottom'
  } else if (effective === 'top' && rect.top - TOOLTIP_GAP - tooltipEstH < 0) {
    effective = rect.top + rect.height + TOOLTIP_GAP + tooltipEstH < vh ? 'bottom' : 'top'
  } else if (effective === 'left' && rect.left - TOOLTIP_GAP - tooltipMaxW < 0) {
    // Not enough room to the left — try right, then bottom
    if (rect.left + rect.width + TOOLTIP_GAP + tooltipMaxW < vw) effective = 'right'
    else effective = 'bottom'
  } else if (effective === 'right' && rect.left + rect.width + TOOLTIP_GAP + tooltipMaxW > vw) {
    if (rect.left - TOOLTIP_GAP - tooltipMaxW > 0) effective = 'left'
    else effective = 'bottom'
  }

  const clampLeft = (centerX: number) =>
    Math.max(margin, Math.min(centerX - tooltipMaxW / 2, vw - tooltipMaxW - margin))

  switch (effective) {
    case 'bottom': {
      let top = rect.top + rect.height + TOOLTIP_GAP
      // If still overflows (large target fills screen), clamp to visible area
      if (top + tooltipEstH > vh) top = vh - tooltipEstH - margin
      if (top < margin) top = margin
      style.top = top
      style.left = clampLeft(rect.left + rect.width / 2)
      break
    }
    case 'top': {
      let bottom = vh - rect.top + TOOLTIP_GAP
      if (bottom + tooltipEstH > vh) bottom = vh - tooltipEstH - margin
      if (bottom < margin) bottom = margin
      style.bottom = bottom
      style.left = clampLeft(rect.left + rect.width / 2)
      break
    }
    case 'right': {
      let top = rect.top + rect.height / 2
      // Clamp vertically
      top = Math.max(margin, Math.min(top, vh - tooltipEstH - margin))
      style.top = top
      style.left = rect.left + rect.width + TOOLTIP_GAP
      style.transform = 'translateY(-50%)'
      break
    }
    case 'left': {
      let top = rect.top + rect.height / 2
      top = Math.max(margin, Math.min(top, vh - tooltipEstH - margin))
      style.top = top
      style.right = vw - rect.left + TOOLTIP_GAP
      style.transform = 'translateY(-50%)'
      break
    }
  }

  return style
}

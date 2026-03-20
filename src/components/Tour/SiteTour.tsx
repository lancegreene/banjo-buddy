// ─── SiteTour — Spotlight overlay tour for new users ─────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { STUDENT_TOUR, TEACHER_TOUR, type TourStep } from '../../data/tourSteps'
import { useStore } from '../../store/useStore'

const PADDING = 8  // px around the spotlight target
const TOOLTIP_GAP = 12 // px between spotlight and tooltip

interface Rect {
  top: number; left: number; width: number; height: number
}

export function SiteTour() {
  const tourActive = useStore((s) => s.tourActive)
  const tourStep = useStore((s) => s.tourStep)
  const advanceTour = useStore((s) => s.advanceTour)
  const dismissTour = useStore((s) => s.dismissTour)
  const activeUserRole = useStore((s) => s.activeUserRole)

  const steps: TourStep[] = activeUserRole === 'teacher' ? TEACHER_TOUR : STUDENT_TOUR
  const step = steps[tourStep]
  const isLast = tourStep === steps.length - 1

  const [rect, setRect] = useState<Rect | null>(null)

  // Find and measure the target element
  const measure = useCallback(() => {
    if (!step) return
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    })
  }, [step])

  // Re-measure on step change and window resize
  useEffect(() => {
    if (!tourActive) return
    // Small delay to allow DOM to settle (e.g. after page navigation)
    const timer = setTimeout(measure, 100)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [tourActive, tourStep, measure])

  if (!tourActive || !step) return null

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
          <div className="tour-tooltip-header">
            <span className="tour-tooltip-title">{step.title}</span>
            <span className="tour-tooltip-counter">{tourStep + 1} / {steps.length}</span>
          </div>
          <p className="tour-tooltip-body">{step.body}</p>
          <div className="tour-tooltip-footer">
            <button className="tour-btn-skip" onClick={dismissTour}>
              {isLast ? 'Done' : 'Skip Tour'}
            </button>
            {!isLast && (
              <button className="tour-btn-next" onClick={advanceTour}>
                Next
              </button>
            )}
            {isLast && (
              <button className="tour-btn-next" onClick={dismissTour}>
                Get Started!
              </button>
            )}
          </div>
          {/* Progress dots */}
          <div className="tour-dots">
            {steps.map((_, i) => (
              <div key={i} className={`tour-dot ${i === tourStep ? 'tour-dot-active' : i < tourStep ? 'tour-dot-done' : ''}`} />
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
    // Center on screen if no target found
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  const style: React.CSSProperties = { position: 'fixed' }
  const tooltipMaxW = 320

  switch (placement) {
    case 'bottom':
      style.top = rect.top + rect.height + TOOLTIP_GAP
      style.left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipMaxW / 2, window.innerWidth - tooltipMaxW - 16))
      break
    case 'top':
      style.bottom = window.innerHeight - rect.top + TOOLTIP_GAP
      style.left = Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipMaxW / 2, window.innerWidth - tooltipMaxW - 16))
      break
    case 'right':
      style.top = rect.top + rect.height / 2
      style.left = rect.left + rect.width + TOOLTIP_GAP
      style.transform = 'translateY(-50%)'
      break
    case 'left':
      style.top = rect.top + rect.height / 2
      style.right = window.innerWidth - rect.left + TOOLTIP_GAP
      style.transform = 'translateY(-50%)'
      break
  }

  return style
}

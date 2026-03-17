import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number
  className?: string
  suffix?: string
}

export function AnimatedCounter({ value, duration = 600, className = '', suffix = '' }: Props) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return

    const startTime = performance.now()

    function animate() {
      const elapsed = performance.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        prevRef.current = to
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <span className={className}>{display}{suffix}</span>
}

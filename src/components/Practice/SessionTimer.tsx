import { useState, useEffect, useRef } from 'react'

interface Props {
  totalMinutes: number
  segments?: { label: string; color: string; fraction: number }[]
  onTimeUp?: () => void
}

export function SessionTimer({ totalMinutes, segments, onTimeUp }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  const totalSec = totalMinutes * 60

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const sec = Math.floor((now - startRef.current) / 1000)
      setElapsed(sec)
      if (sec >= totalSec && onTimeUp) onTimeUp()
    }, 1000)
    return () => clearInterval(timer)
  }, [totalSec, onTimeUp])

  const progress = Math.min(1, elapsed / totalSec)
  const remaining = Math.max(0, totalSec - elapsed)
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  const size = 120
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="session-timer">
      <svg width={size} height={size} className="session-timer-svg">
        {/* Background circle */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--border-primary, #3A3E48)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--accent-primary, #D4A04A)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        {/* Time text */}
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-primary, #E8E6E3)"
          fontSize="20"
          fontWeight="700"
        >
          {mins}:{String(secs).padStart(2, '0')}
        </text>
      </svg>
      {progress >= 0.8 && progress < 1 && (
        <p className="session-timer-suggestion">One more review item?</p>
      )}
    </div>
  )
}

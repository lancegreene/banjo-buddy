import { useEffect, useRef } from 'react'

interface Props {
  onComplete: () => void
}

export function OnboardingSuccess({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Simple confetti effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }[] = []
    const colors = ['#D4A04A', '#4ADE80', '#4A9EFF', '#C084FC', '#F5A623']

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 3,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 2,
        life: 1,
      })
    }

    let frame = 0
    function animate() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      for (const p of particles) {
        p.x += p.vx
        p.vy += 0.15
        p.y += p.vy
        p.life -= 0.008
        if (p.life <= 0) continue
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }
      ctx.globalAlpha = 1
      if (frame++ < 180) requestAnimationFrame(animate)
    }
    animate()
  }, [])

  return (
    <div className="onboarding-success">
      <canvas ref={canvasRef} className="onboarding-confetti" />
      <div className="onboarding-success-content">
        <h2 className="onboarding-title">You're Ready!</h2>
        <p className="onboarding-desc">
          Your mic is working and you played your first notes.
          Let's start your banjo journey!
        </p>
        <button className="btn btn-primary" onClick={onComplete}>
          Start Practicing
        </button>
      </div>
    </div>
  )
}

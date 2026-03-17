import { useEffect, useRef } from 'react'

interface Props {
  trigger: boolean
  duration?: number
}

const COLORS = ['#D4A04A', '#4ADE80', '#4A9EFF', '#C084FC', '#F5A623', '#EF4444']

export function ConfettiEffect({ trigger, duration = 3000 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!trigger) return
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!

    const particles: {
      x: number; y: number; vx: number; vy: number
      color: string; size: number; rotation: number; rotSpeed: number; life: number
    }[] = []

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width * (0.3 + Math.random() * 0.4),
        y: canvas.height * 0.3,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
      })
    }

    const start = performance.now()

    function animate() {
      const elapsed = performance.now() - start
      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height)
        return
      }

      ctx.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const p of particles) {
        p.x += p.vx
        p.vy += 0.2
        p.y += p.vy
        p.vx *= 0.99
        p.rotation += p.rotSpeed
        p.life = Math.max(0, 1 - elapsed / duration)

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => cancelAnimationFrame(frameRef.current)
  }, [trigger, duration])

  if (!trigger) return null

  return (
    <canvas
      ref={canvasRef}
      className="confetti-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}

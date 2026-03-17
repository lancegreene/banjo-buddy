import type { HighwayNote, HighwayConfig } from './noteHighwayTypes'
import { DEFAULT_HIGHWAY_CONFIG } from './noteHighwayTypes'

export class NoteHighwayRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: HighwayConfig
  private notes: HighwayNote[] = []
  private currentTime = 0
  private animFrameId: number | null = null
  private lastFrameTime = 0
  private running = false
  private cssWidth: number
  private cssHeight: number

  constructor(canvas: HTMLCanvasElement, config: Partial<HighwayConfig> = {}, cssWidth?: number, cssHeight?: number) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.config = { ...DEFAULT_HIGHWAY_CONFIG, ...config }
    // Use explicit CSS dimensions if provided, otherwise fall back to canvas attributes
    this.cssWidth = cssWidth ?? canvas.width
    this.cssHeight = cssHeight ?? canvas.height
  }

  setNotes(notes: HighwayNote[]) {
    this.notes = notes
    this.render() // draw immediately so lanes + notes are visible before start()
  }

  setCurrentTime(time: number) {
    this.currentTime = time
  }

  markNote(noteId: string, state: 'hit' | 'miss') {
    const note = this.notes.find(n => n.id === noteId)
    if (note) note.state = state
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastFrameTime = performance.now()
    this.animate()
  }

  stop() {
    this.running = false
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }

  destroy() {
    this.stop()
  }

  private animate = () => {
    if (!this.running) return

    const now = performance.now()
    const dt = (now - this.lastFrameTime) / 1000
    this.lastFrameTime = now
    this.currentTime += dt

    this.render()
    this.animFrameId = requestAnimationFrame(this.animate)
  }

  private render() {
    const { ctx, config } = this
    const w = this.cssWidth
    const h = this.cssHeight

    // Clear
    ctx.fillStyle = '#1A1D23'
    ctx.fillRect(0, 0, w, h)

    const laneHeight = h / config.laneCount
    const strikeX = w * config.strikeZoneX

    // Draw lanes
    for (let i = 0; i < config.laneCount; i++) {
      const y = i * laneHeight
      ctx.fillStyle = i % 2 === 0 ? '#22262E' : '#1E2128'
      ctx.fillRect(0, y, w, laneHeight)

      // Lane separator
      ctx.strokeStyle = '#2A2E38'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y + laneHeight)
      ctx.lineTo(w, y + laneHeight)
      ctx.stroke()

      // String label
      ctx.fillStyle = '#585450'
      ctx.font = '11px system-ui'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${i + 1}`, 4, y + laneHeight / 2)
    }

    // Draw strike zone
    ctx.fillStyle = 'rgba(212, 160, 74, 0.15)'
    ctx.fillRect(strikeX - 3, 0, 6, h)
    ctx.strokeStyle = '#D4A04A'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(strikeX, 0)
    ctx.lineTo(strikeX, h)
    ctx.stroke()

    // Draw notes
    const visibleWindowSec = w / config.scrollSpeed

    for (const note of this.notes) {
      const timeDelta = note.time - this.currentTime

      // Skip notes far offscreen
      if (timeDelta > visibleWindowSec || timeDelta < -1) continue

      const x = strikeX + timeDelta * config.scrollSpeed
      const lane = note.string - 1 // string 1 = lane 0 (top)
      const y = lane * laneHeight + (laneHeight - config.noteHeight) / 2

      // Note color based on state
      let fillColor: string
      let strokeColor: string
      switch (note.state) {
        case 'hit':
          fillColor = 'rgba(74, 222, 128, 0.8)'
          strokeColor = '#4ADE80'
          break
        case 'miss':
          fillColor = 'rgba(239, 68, 68, 0.8)'
          strokeColor = '#EF4444'
          break
        case 'current':
          fillColor = 'rgba(255, 255, 255, 0.9)'
          strokeColor = '#FFFFFF'
          break
        default:
          fillColor = 'rgba(212, 160, 74, 0.6)'
          strokeColor = '#D4A04A'
      }

      // Current note glow
      if (note.state === 'current') {
        ctx.shadowColor = '#FFFFFF'
        ctx.shadowBlur = 12
      }

      // Rounded rect
      const r = 6
      ctx.beginPath()
      ctx.roundRect(x - config.noteWidth / 2, y, config.noteWidth, config.noteHeight, r)
      ctx.fillStyle = fillColor
      ctx.fill()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.shadowBlur = 0

      // Fret number
      ctx.fillStyle = note.state === 'upcoming' ? '#1A1D23' : '#FFFFFF'
      ctx.font = 'bold 13px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        note.fret === 0 ? 'O' : String(note.fret),
        x,
        y + config.noteHeight / 2
      )
    }
  }
}

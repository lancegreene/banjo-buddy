// Banjo Buddy — AlphaTab Viewer (lazy-loaded)
// Renders Guitar Pro files with scrolling playback and cursor sync.

import { useRef, useEffect, useState } from 'react'

interface Props {
  file?: ArrayBuffer        // .gp5/.gpx file data
  trackIndex?: number       // which track to display (default: 0)
  onReady?: () => void
  onPlaybackEnd?: () => void
}

export function AlphaTabViewer({ file, trackIndex = 0, onReady, onPlaybackEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !file) return

    let cancelled = false

    async function init() {
      try {
        // Dynamic import — ~500KB lazy-loaded
        const alphaTab = await import('@coderline/alphatab')
        if (cancelled) return

        const settings = new alphaTab.Settings()
        settings.core.fontDirectory = '/font/'
        settings.core.engine = 'html5'
        settings.display.staveProfile = 'Tab'
        settings.player.enablePlayer = true
        settings.player.enableCursor = true
        settings.player.enableUserInteraction = true
        settings.player.soundFont = '/soundfont/sonivox.sf2'

        const api = new alphaTab.AlphaTabApi(containerRef.current!, settings)
        apiRef.current = api

        api.scoreLoaded.on(() => {
          setIsLoading(false)
          if (api.tracks.length > trackIndex) {
            api.renderTracks([api.tracks[trackIndex]])
          }
          onReady?.()
        })

        api.playerFinished.on(() => {
          onPlaybackEnd?.()
        })

        api.error.on((e: any) => {
          setError(e.message || 'Failed to load tab')
          setIsLoading(false)
        })

        // Load the file
        const uint8 = new Uint8Array(file)
        api.load(uint8)
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to initialize AlphaTab')
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
      apiRef.current?.destroy()
      apiRef.current = null
    }
  }, [file, trackIndex])

  if (!file) {
    return (
      <div className="alpha-tab-viewer alpha-tab-empty">
        <p>No tab file loaded</p>
      </div>
    )
  }

  return (
    <div className="alpha-tab-viewer">
      {isLoading && (
        <div className="alpha-tab-loading">
          <div className="loading-spinner" />
          <p>Loading tab...</p>
        </div>
      )}
      {error && (
        <div className="alpha-tab-error">
          <p>Error: {error}</p>
        </div>
      )}
      <div ref={containerRef} className="alpha-tab-container" />
      {apiRef.current && (
        <div className="alpha-tab-controls">
          <button className="btn btn-secondary" onClick={() => apiRef.current?.playPause()}>
            Play / Pause
          </button>
          <button className="btn btn-secondary" onClick={() => apiRef.current?.stop()}>
            Stop
          </button>
        </div>
      )}
    </div>
  )
}

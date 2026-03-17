// Banjo Buddy — WaveSurfer Hook
// Manages wavesurfer.js lifecycle for the Riff Repeater component.

import { useRef, useEffect, useCallback, useState } from 'react'

interface UseWaveSurferOptions {
  container: HTMLElement | null
  onReady?: () => void
  onFinish?: () => void
  onTimeUpdate?: (currentTime: number) => void
}

export interface UseWaveSurferReturn {
  isReady: boolean
  isPlaying: boolean
  duration: number
  currentTime: number
  loadBlob: (blob: Blob) => void
  loadUrl: (url: string) => void
  play: () => void
  pause: () => void
  stop: () => void
  seekTo: (progress: number) => void
  setPlaybackRate: (rate: number) => void
  setRegion: (start: number, end: number) => void
  clearRegion: () => void
  destroy: () => void
}

export function useWaveSurfer(options: UseWaveSurferOptions): UseWaveSurferReturn {
  const wsRef = useRef<any>(null)
  const regionRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    if (!options.container) return

    let cancelled = false

    async function init() {
      const WaveSurfer = (await import('wavesurfer.js')).default
      if (cancelled) return

      const ws = WaveSurfer.create({
        container: options.container!,
        waveColor: 'var(--text-tertiary)',
        progressColor: 'var(--accent-primary)',
        cursorColor: 'var(--accent-primary)',
        barWidth: 2,
        barRadius: 2,
        height: 80,
        normalize: true,
      })

      ws.on('ready', () => {
        setIsReady(true)
        setDuration(ws.getDuration())
        options.onReady?.()
      })

      ws.on('play', () => setIsPlaying(true))
      ws.on('pause', () => setIsPlaying(false))
      ws.on('finish', () => {
        setIsPlaying(false)
        options.onFinish?.()
      })
      ws.on('audioprocess', (time: number) => {
        setCurrentTime(time)
        options.onTimeUpdate?.(time)
      })

      wsRef.current = ws
    }

    init()

    return () => {
      cancelled = true
      wsRef.current?.destroy()
      wsRef.current = null
      setIsReady(false)
      setIsPlaying(false)
    }
  }, [options.container])

  const loadBlob = useCallback((blob: Blob) => {
    wsRef.current?.loadBlob(blob)
  }, [])

  const loadUrl = useCallback((url: string) => {
    wsRef.current?.load(url)
  }, [])

  const play = useCallback(() => { wsRef.current?.play() }, [])
  const pause = useCallback(() => { wsRef.current?.pause() }, [])
  const stop = useCallback(() => {
    wsRef.current?.stop()
    setIsPlaying(false)
  }, [])

  const seekTo = useCallback((progress: number) => {
    wsRef.current?.seekTo(progress)
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    wsRef.current?.setPlaybackRate(rate)
  }, [])

  const setRegion = useCallback((start: number, end: number) => {
    // Region looping via manual seek on finish
    regionRef.current = { start, end }
  }, [])

  const clearRegion = useCallback(() => {
    regionRef.current = null
  }, [])

  const destroy = useCallback(() => {
    wsRef.current?.destroy()
    wsRef.current = null
    setIsReady(false)
    setIsPlaying(false)
  }, [])

  return {
    isReady, isPlaying, duration, currentTime,
    loadBlob, loadUrl, play, pause, stop,
    seekTo, setPlaybackRate, setRegion, clearRegion, destroy,
  }
}

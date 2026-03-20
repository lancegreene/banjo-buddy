// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — TeacherClipPlayer Component
// Displays teacher demo clips with trimmed playback and thumbnail strip.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import type { TeacherClip } from '../../db/db'

interface TeacherClipPlayerProps {
  clips: TeacherClip[]
}

export function TeacherClipPlayer({ clips }: TeacherClipPlayerProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lightboxVideoRef = useRef<HTMLVideoElement>(null)

  // Generate object URLs for thumbnails
  const [thumbUrls, setThumbUrls] = useState<(string | null)[]>([])
  useEffect(() => {
    const urls = clips.map((c) => c.thumbnailBlob ? URL.createObjectURL(c.thumbnailBlob) : null)
    setThumbUrls(urls)
    return () => urls.forEach((u) => { if (u) URL.revokeObjectURL(u) })
  }, [clips])

  // Video URL for active clip
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  useEffect(() => {
    const clip = clips[activeIndex]
    if (!clip) { setVideoUrl(null); return }
    const url = URL.createObjectURL(clip.videoBlob)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [clips, activeIndex])

  const activeClip = clips[activeIndex]

  // Trimmed playback enforcement
  useEffect(() => {
    const el = videoRef.current
    if (!el || !activeClip) return
    const { trimStart, trimEnd } = activeClip

    function handleTimeUpdate() {
      if (el && el.currentTime >= trimEnd) {
        el.pause()
        el.currentTime = trimStart
      }
    }
    function handlePlay() {
      if (el && el.currentTime < trimStart) {
        el.currentTime = trimStart
      }
    }
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('play', handlePlay)
    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('play', handlePlay)
    }
  }, [activeClip, videoUrl])

  // Same for lightbox
  useEffect(() => {
    const el = lightboxVideoRef.current
    if (!el || !activeClip || !lightbox) return
    const { trimStart, trimEnd } = activeClip

    function handleTimeUpdate() {
      if (el && el.currentTime >= trimEnd) {
        el.pause()
        el.currentTime = trimStart
      }
    }
    function handlePlay() {
      if (el && el.currentTime < trimStart) {
        el.currentTime = trimStart
      }
    }
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('play', handlePlay)
    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('play', handlePlay)
    }
  }, [activeClip, lightbox])

  if (clips.length === 0) return null

  return (
    <div className="teacher-clip-player">
      <button
        className="teacher-clip-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="teacher-clip-header-text">Teacher Demos ({clips.length})</span>
        <span className="teacher-clip-expand">{collapsed ? '\u25B8' : '\u25BE'}</span>
      </button>

      {!collapsed && (
        <div className="teacher-clip-body">
          {/* Thumbnail strip */}
          {clips.length > 1 && (
            <div className="teacher-clip-strip">
              {clips.map((clip, i) => (
                <button
                  key={clip.id}
                  className={`teacher-clip-thumb ${i === activeIndex ? 'teacher-clip-thumb-active' : ''}`}
                  onClick={() => setActiveIndex(i)}
                  title={clip.title}
                >
                  {thumbUrls[i] ? (
                    <img src={thumbUrls[i]!} alt={clip.title} className="teacher-clip-thumb-img" />
                  ) : (
                    <div className="teacher-clip-thumb-placeholder">{'\u25B6'}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Inline player */}
          {videoUrl && activeClip && (
            <div className="teacher-clip-inline">
              <div className="teacher-clip-title-row">
                <span className="teacher-clip-title">{activeClip.title}</span>
                <button
                  className="teacher-clip-fullscreen"
                  onClick={() => setLightbox(true)}
                  title="Expand"
                >
                  {'\u26F6'}
                </button>
              </div>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                className="teacher-clip-video"
              />
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && videoUrl && activeClip && (
        <div className="media-lightbox" onClick={() => setLightbox(false)}>
          <div className="media-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <video
              ref={lightboxVideoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="teacher-clip-lightbox-video"
            />
            <div className="teacher-clip-lightbox-title">{activeClip.title}</div>
            <button className="media-lightbox-close" onClick={() => setLightbox(false)}>
              {'\u00D7'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

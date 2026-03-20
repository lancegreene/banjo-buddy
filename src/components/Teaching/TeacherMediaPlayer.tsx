// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — TeacherMediaPlayer
// Displays teacher media grouped by type: videos, audio, images, tabs.
// Videos/audio open in lightbox. Tab crops display inline.
// In teacher mode, items can be reordered with arrow buttons.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { TeacherClip, MediaDisplaySettings } from '../../db/db'
import { useStore } from '../../store/useStore'
import { reorderClips } from '../../engine/teacherClipService'

const DEFAULTS: Required<MediaDisplaySettings> = {
  videoThumbWidth: 216,
  tabMaxWidth: 200,
  imageMaxWidth: 0, // 0 = full width
}

interface TeacherMediaPlayerProps {
  clips: TeacherClip[]
  editable?: boolean
  onClipsReordered?: () => void
}

export function TeacherMediaPlayer({ clips, editable, onClipsReordered }: TeacherMediaPlayerProps) {
  const teacherConfig = useStore((s) => s.teacherConfig)
  const ds: Required<MediaDisplaySettings> = {
    ...DEFAULTS,
    ...teacherConfig?.mediaDisplay,
  }

  // Split clips by type
  const { videos, audios, images, tabCrops } = useMemo(() => {
    const videos: TeacherClip[] = []
    const audios: TeacherClip[] = []
    const images: TeacherClip[] = []
    const tabCrops: TeacherClip[] = []
    for (const c of clips) {
      switch (c.mediaType) {
        case 'audio': audios.push(c); break
        case 'image': images.push(c); break
        case 'tab_crop': tabCrops.push(c); break
        default: videos.push(c); break // 'video' or legacy undefined
      }
    }
    return { videos, audios, images, tabCrops }
  }, [clips])

  if (clips.length === 0) return null

  return (
    <div className="teacher-media-sections">
      {videos.length > 0 && <VideoSection clips={videos} thumbWidth={ds.videoThumbWidth} editable={editable} onReordered={onClipsReordered} />}
      {audios.length > 0 && <AudioSection clips={audios} editable={editable} onReordered={onClipsReordered} />}
      {images.length > 0 && <ImageSection clips={images} maxWidth={ds.imageMaxWidth} editable={editable} onReordered={onClipsReordered} />}
      {tabCrops.length > 0 && <TabSection clips={tabCrops} maxWidth={ds.tabMaxWidth} editable={editable} onReordered={onClipsReordered} />}
    </div>
  )
}

// ── Shared reorder hook ──────────────────────────────────────────────────────

function useReorder<T extends { id: string }>(
  initialItems: T[],
  editable: boolean | undefined,
  onReordered?: () => void
) {
  const [items, setItems] = useState(initialItems)

  // Sync when parent clips change
  useEffect(() => { setItems(initialItems) }, [initialItems])

  const move = useCallback((fromIdx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const toIdx = fromIdx + dir
      if (toIdx < 0 || toIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]]
      // Persist
      reorderClips(next.map((item) => item.id)).then(() => onReordered?.())
      return next
    })
  }, [onReordered])

  return { items, editable: !!editable, move }
}

function MoveButtons({ index, total, onMove }: { index: number; total: number; onMove: (idx: number, dir: -1 | 1) => void }) {
  return (
    <span className="teacher-media-move-btns">
      <button
        className="teacher-media-move-btn"
        disabled={index === 0}
        onClick={(e) => { e.stopPropagation(); onMove(index, -1) }}
        title="Move up"
      >{'\u25C0'}</button>
      <button
        className="teacher-media-move-btn"
        disabled={index === total - 1}
        onClick={(e) => { e.stopPropagation(); onMove(index, 1) }}
        title="Move down"
      >{'\u25B6'}</button>
    </span>
  )
}

// ── Video Section ─────────────────────────────────────────────────────────────

function VideoSection({ clips, thumbWidth, editable, onReordered }: { clips: TeacherClip[]; thumbWidth: number; editable?: boolean; onReordered?: () => void }) {
  const { items, editable: canEdit, move } = useReorder(clips, editable, onReordered)
  const [lightboxClip, setLightboxClip] = useState<TeacherClip | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [thumbUrls, setThumbUrls] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    const urls = new Map<string, string>()
    items.forEach((c) => { if (c.thumbnailBlob) urls.set(c.id, URL.createObjectURL(c.thumbnailBlob)) })
    setThumbUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [items])

  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!lightboxClip?.videoBlob) { setMediaUrl(null); return }
    const url = URL.createObjectURL(lightboxClip.videoBlob)
    setMediaUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [lightboxClip])

  // Trimmed playback
  useEffect(() => {
    const el = videoRef.current
    if (!el || !lightboxClip) return
    const { trimStart, trimEnd } = lightboxClip
    function handleTimeUpdate() { if (el && el.currentTime >= trimEnd) { el.pause(); el.currentTime = trimStart } }
    function handlePlay() { if (el && el.currentTime < trimStart) el.currentTime = trimStart }
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('play', handlePlay)
    return () => { el.removeEventListener('timeupdate', handleTimeUpdate); el.removeEventListener('play', handlePlay) }
  }, [lightboxClip, mediaUrl])

  return (
    <div className="teacher-media-section">
      <div className="teacher-media-section-header">Videos ({items.length})</div>
      <div className="teacher-media-strip">
        {items.map((clip, idx) => (
          <div key={clip.id} className="teacher-media-thumb-wrap">
            <button
              className="teacher-media-thumb teacher-media-thumb-video"
              style={{ width: thumbWidth, height: Math.round(thumbWidth * 0.75) }}
              onClick={() => setLightboxClip(clip)}
              title={clip.title}
            >
              {thumbUrls.has(clip.id) ? (
                <img src={thumbUrls.get(clip.id)!} alt={clip.title} className="teacher-media-thumb-img" />
              ) : (
                <div className="teacher-media-thumb-placeholder">{'\u25B6'}</div>
              )}
              <span className="teacher-media-play-icon">{'\u25B6'}</span>
            </button>
            {canEdit && items.length > 1 && <MoveButtons index={idx} total={items.length} onMove={move} />}
          </div>
        ))}
      </div>

      {lightboxClip && mediaUrl && (
        <div className="media-lightbox" onClick={() => setLightboxClip(null)}>
          <div className="media-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="media-lightbox-close" onClick={() => setLightboxClip(null)}>{'\u00D7'}</button>
            <video ref={videoRef} src={mediaUrl} controls autoPlay playsInline className="media-lightbox-video" />
            <div className="media-lightbox-caption">{lightboxClip.title}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Audio Section ─────────────────────────────────────────────────────────────

function AudioSection({ clips, editable, onReordered }: { clips: TeacherClip[]; editable?: boolean; onReordered?: () => void }) {
  const { items, editable: canEdit, move } = useReorder(clips, editable, onReordered)
  const [lightboxClip, setLightboxClip] = useState<TeacherClip | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!lightboxClip?.audioBlob) { setMediaUrl(null); return }
    const url = URL.createObjectURL(lightboxClip.audioBlob)
    setMediaUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [lightboxClip])

  // Trimmed playback
  useEffect(() => {
    const el = audioRef.current
    if (!el || !lightboxClip) return
    const { trimStart, trimEnd } = lightboxClip
    function handleTimeUpdate() { if (el && el.currentTime >= trimEnd) { el.pause(); el.currentTime = trimStart } }
    function handlePlay() { if (el && el.currentTime < trimStart) el.currentTime = trimStart }
    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('play', handlePlay)
    return () => { el.removeEventListener('timeupdate', handleTimeUpdate); el.removeEventListener('play', handlePlay) }
  }, [lightboxClip, mediaUrl])

  return (
    <div className="teacher-media-section">
      <div className="teacher-media-section-header">Audio ({items.length})</div>
      <div className="teacher-media-audio-list">
        {items.map((clip, idx) => (
          <button
            key={clip.id}
            className="teacher-media-audio-item"
            onClick={() => setLightboxClip(clip)}
            title={clip.title}
          >
            <span className="teacher-media-audio-icon">{'\u266B'}</span>
            <span className="teacher-media-audio-title">{clip.title}</span>
            {canEdit && items.length > 1 && <MoveButtons index={idx} total={items.length} onMove={move} />}
            <span className="teacher-media-audio-play">{'\u25B6'}</span>
          </button>
        ))}
      </div>

      {lightboxClip && mediaUrl && (
        <div className="media-lightbox" onClick={() => setLightboxClip(null)}>
          <div className="media-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="media-lightbox-close" onClick={() => setLightboxClip(null)}>{'\u00D7'}</button>
            <div className="media-lightbox-audio-wrap">
              <div className="media-lightbox-audio-icon">{'\u266B'}</div>
              <audio ref={audioRef} src={mediaUrl} controls autoPlay className="media-lightbox-audio" />
            </div>
            <div className="media-lightbox-caption">{lightboxClip.title}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Image Section ─────────────────────────────────────────────────────────────

function ImageSection({ clips, maxWidth, editable, onReordered }: { clips: TeacherClip[]; maxWidth: number; editable?: boolean; onReordered?: () => void }) {
  const { items, editable: canEdit, move } = useReorder(clips, editable, onReordered)
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    const urls = new Map<string, string>()
    items.forEach((c) => { if (c.imageBlob) urls.set(c.id, URL.createObjectURL(c.imageBlob)) })
    setImageUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [items])

  const imgStyle = maxWidth > 0 ? { maxWidth: `${maxWidth}px` } : undefined

  return (
    <div className="teacher-media-section">
      <div className="teacher-media-section-header">Images ({items.length})</div>
      <div className="teacher-media-image-list">
        {items.map((clip, idx) => (
          <div key={clip.id} className="teacher-media-image-item">
            {canEdit && items.length > 1 && <MoveButtons index={idx} total={items.length} onMove={move} />}
            {imageUrls.has(clip.id) && (
              <img src={imageUrls.get(clip.id)!} alt={clip.title} className="teacher-media-image-full" style={imgStyle} />
            )}
            {clip.title && clip.title !== 'Untitled Image' && (
              <div className="teacher-media-image-caption">{clip.title}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab Section (inline, with reorder buttons in teacher mode) ───────────────

function TabSection({ clips, maxWidth, editable, onReordered }: { clips: TeacherClip[]; maxWidth: number; editable?: boolean; onReordered?: () => void }) {
  // Group tab crops by sourceImageId
  const groups = useMemo(() => {
    const map = new Map<string, TeacherClip[]>()
    for (const c of clips) {
      const key = c.sourceImageId ?? c.id
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return [...map.values()]
  }, [clips])

  return (
    <div className="teacher-media-section">
      <div className="teacher-media-section-header">Tablature ({clips.length})</div>
      {groups.map((group) => (
        <TabGroup key={group[0].sourceImageId ?? group[0].id} crops={group} maxWidth={maxWidth} editable={editable} onReordered={onReordered} />
      ))}
    </div>
  )
}

function TabGroup({ crops, maxWidth, editable, onReordered }: { crops: TeacherClip[]; maxWidth: number; editable?: boolean; onReordered?: () => void }) {
  const { items, editable: canEdit, move } = useReorder(crops, editable, onReordered)
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    const urls = new Map<string, string>()
    items.forEach((c) => { if (c.imageBlob) urls.set(c.id, URL.createObjectURL(c.imageBlob)) })
    setImageUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [items])

  return (
    <div className="teacher-media-tab-group">
      {items.map((crop, idx) => (
        <div key={crop.id} className="teacher-media-tab-item">
          {canEdit && items.length > 1 && <MoveButtons index={idx} total={items.length} onMove={move} />}
          {imageUrls.has(crop.id) && (
            <img
              src={imageUrls.get(crop.id)!}
              alt={crop.title}
              className="teacher-media-tab-img"
              style={{ maxWidth: `${maxWidth}px` }}
            />
          )}
          <span className="teacher-media-tab-label">{crop.title}</span>
        </div>
      ))}
    </div>
  )
}

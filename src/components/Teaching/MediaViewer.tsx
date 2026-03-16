// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Media Viewer (Technique Guides)
// Lightbox with zoom for images and looping video for technique demos.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { SkillVideo, SkillImage } from '../../data/curriculum'

interface MediaViewerProps {
  video?: SkillVideo
  image?: SkillImage
}

export function MediaViewer({ video, image }: MediaViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!video && !image) return null

  return (
    <>
      <div className="media-viewer" onClick={() => setIsExpanded(true)}>
        {video ? (
          <video
            src={`${import.meta.env.BASE_URL}${video.src}`}
            poster={video.poster ? `${import.meta.env.BASE_URL}${video.poster}` : undefined}
            loop={video.loop !== false}
            muted
            autoPlay
            playsInline
            className="media-viewer-video"
          />
        ) : image ? (
          <img
            src={`${import.meta.env.BASE_URL}${image.src}`}
            alt={image.alt}
            className="media-viewer-image"
          />
        ) : null}
        <span className="media-viewer-expand-hint">Tap to enlarge</span>
      </div>

      {/* Lightbox */}
      {isExpanded && (
        <div className="media-lightbox" onClick={() => setIsExpanded(false)}>
          <div className="media-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="media-lightbox-close" onClick={() => setIsExpanded(false)}>✕</button>
            {video ? (
              <video
                src={`${import.meta.env.BASE_URL}${video.src}`}
                loop={video.loop !== false}
                controls
                autoPlay
                playsInline
                className="media-lightbox-video"
              />
            ) : image ? (
              <img
                src={`${import.meta.env.BASE_URL}${image.src}`}
                alt={image.alt}
                className="media-lightbox-image"
              />
            ) : null}
            {image?.caption && <p className="media-lightbox-caption">{image.caption}</p>}
          </div>
        </div>
      )}
    </>
  )
}

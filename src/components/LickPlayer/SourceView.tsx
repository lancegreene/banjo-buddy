// ─────────────────────────────────────────────────────────────────────────────
// SourceView — Renders a source-page image with an optional bbox overlay.
// Pure presentational. Used by LickPlayer for QC of agent-transcribed licks.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

export interface SourceBBox {
  x: number       // 0..1, fraction of image width
  y: number       // 0..1, fraction of image height
  width: number   // 0..1, fraction of image width
  height: number  // 0..1, fraction of image height
}

interface SourceViewProps {
  sourcePage: string       // filename, e.g. 'splitting-licks-p10.jpg'
  sourceBbox?: SourceBBox
  sourceLabel: string      // e.g. 'Splitting the Licks, p.10'
}

export function SourceView({ sourcePage, sourceBbox, sourceLabel }: SourceViewProps) {
  const [errored, setErrored] = useState(false)
  const src = `${import.meta.env.BASE_URL}sources/${sourcePage}`

  if (errored) {
    return (
      <div className="lick-source-error">
        Source image unavailable: <code>{sourcePage}</code>
      </div>
    )
  }

  return (
    <div className="lick-source-view">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="lick-source-image-link"
        title="Open full image in new tab"
      >
        <div className="lick-source-image-wrap">
          <img
            src={src}
            alt={`Source: ${sourceLabel}`}
            className="lick-source-image"
            onError={() => setErrored(true)}
            loading="lazy"
          />
          {sourceBbox && (
            <div
              className="lick-source-bbox-overlay"
              style={{
                left: `${sourceBbox.x * 100}%`,
                top: `${sourceBbox.y * 100}%`,
                width: `${sourceBbox.width * 100}%`,
                height: `${sourceBbox.height * 100}%`,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      </a>
      <div className="lick-source-label">Source: {sourceLabel}</div>
    </div>
  )
}

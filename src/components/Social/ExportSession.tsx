import { useState } from 'react'
import { exportSessionAsJson, type ExportableSession } from '../../engine/challengeEngine'

interface Props {
  sessions: ExportableSession[]
}

export function ExportSession({ sessions }: Props) {
  const [exported, setExported] = useState(false)

  function handleExport() {
    const json = exportSessionAsJson(sessions)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `banjo-buddy-session-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <button className="btn btn-secondary" onClick={handleExport}>
      {exported ? 'Exported!' : 'Export Session'}
    </button>
  )
}

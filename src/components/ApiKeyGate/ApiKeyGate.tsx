import { useState } from 'react'
import { useStore } from '../../store/useStore'

export function ApiKeyGate() {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const setApiKey = useStore((s) => s.setApiKey)
  const setPage = useStore((s) => s.setPage)
  const assessmentCompletedAt = useStore((s) => s.assessmentCompletedAt)

  const submit = async () => {
    const trimmed = input.trim()
    if (!trimmed.startsWith('sk-ant-')) {
      setError('Anthropic API keys start with "sk-ant-"')
      return
    }
    await setApiKey(trimmed)
    // After key is set: if assessment is already done, go straight to dashboard.
    // Otherwise, go to assessment.
    setPage(assessmentCompletedAt ? 'plan-dashboard' : 'assessment')
  }

  return (
    <div className="api-key-gate">
      <h1>Connect your Claude API key</h1>
      <p>
        Banjo Buddy uses Claude to generate your personalized practice plan.
        Your key is stored locally — never sent anywhere except api.anthropic.com.
      </p>
      <input
        type="password"
        placeholder="sk-ant-..."
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(null) }}
        autoFocus
      />
      {error && <p className="api-key-gate-error">{error}</p>}
      <button onClick={submit} disabled={!input.trim()}>Continue</button>
      <p className="api-key-gate-hint">
        Don't have a key? Get one at{' '}
        <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
          console.anthropic.com
        </a>
      </p>
    </div>
  )
}

// ─── useSpeech — Text-to-speech hook using Web Speech API ─────────────────────
import { useState, useCallback, useEffect, useRef } from 'react'

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return

    // Cancel any in-progress speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    utteranceRef.current = utterance

    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  return { speak, stop, speaking }
}

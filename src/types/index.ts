// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types for Banjo Buddy
//
// Types here are not tied to a specific module — they're imported across
// engines, components, and the store. Domain-specific types still live in
// their owning modules (e.g. PerformanceMetrics in ./performance).
// ─────────────────────────────────────────────────────────────────────────────

// Self-reported skill level. Used by the (future) LLM-driven coach to tailor
// recommendations. The curriculum DAG that used to consume this is gone.
export type Path = 'newby' | 'beginner' | 'intermediate'

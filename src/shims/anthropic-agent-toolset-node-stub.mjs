// ─────────────────────────────────────────────────────────────────────────────
// Browser stub for @anthropic-ai/sdk/tools/agent-toolset/{node,fs-util,skills}
//
// The SDK's EnvironmentWorker pulls these in via a dynamic import
// (`await import("../../tools/agent-toolset/node.mjs")`). Rollup follows the
// dynamic import statically, then chokes on the modules' `node:fs`,
// `node:crypto`, `node:path`, `node:child_process` imports under the
// browser-external shim.
//
// The browser never instantiates EnvironmentWorker — `useCoachChat` only calls
// `client.messages.create` — so we redirect the whole Node-only subtree at this
// empty stub via `resolve.alias` in `vite.config.ts`. If anything ever does
// reach these stubs at runtime, throwing makes the misuse obvious instead of
// silently returning nothing.
// ─────────────────────────────────────────────────────────────────────────────

const STUB_ERROR = new Error(
  '@anthropic-ai/sdk agent-toolset is Node-only and stubbed out in the browser bundle. ' +
    'Reaching this code in the browser means EnvironmentWorker (or a related Node-only ' +
    'helper) is being invoked from client code — refactor to call this from a server.',
)

export function setupSkills() {
  throw STUB_ERROR
}

export function betaAgentToolset20260401() {
  throw STUB_ERROR
}

// fs-util and skills exports — referenced by SDK internals we don't run.
export function realpath() {
  throw STUB_ERROR
}
export function lstat() {
  throw STUB_ERROR
}

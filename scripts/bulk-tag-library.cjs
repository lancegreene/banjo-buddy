// scripts/bulk-tag-library.cjs
// One-shot script: read library data, ask Claude to propose concept tags per item,
// write proposed tags to a JSON review file. Run, review, then merge tags into
// library data files manually.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/bulk-tag-library.cjs
//
// Output: scripts/.bulk-tag-proposals.json

const fs = require('fs')
const Anthropic = require('@anthropic-ai/sdk')

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Set ANTHROPIC_API_KEY env var before running.')
  process.exit(1)
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LIBRARY_PATHS = {
  licks: 'src/data/lickLibrary.ts',
  rolls: 'src/data/rollPatterns.ts',
  songs: 'src/data/songLibrary.ts',
  chords: 'src/data/chordDiagrams.ts',
  scales: 'src/data/scaleLibrary.ts',
}

const conceptTagsSource = fs.readFileSync('src/data/conceptTags.ts', 'utf8')

async function tagFile(kind, filepath) {
  const source = fs.readFileSync(filepath, 'utf8')
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: [
      'You are tagging banjo library items with concept tags. Read the concept taxonomy below, then read the data file, then output a JSON object mapping item id -> array of 0-3 tag ids that apply.',
      '',
      'Concept taxonomy:',
      conceptTagsSource,
      '',
      'Rules:',
      '- Tag only what is *clearly* present in the item; do not stretch',
      '- Max 3 tags per item; usually 1-2 is right',
      '- Use ONLY tag IDs from the taxonomy above. Do not invent new ones.',
      '- Skip items where no tag applies (omit them from the output)',
      '- For song-section items, tag the section behavior (e.g., a forward-roll-driven verse gets forward-roll)',
      '- Output ONLY a JSON object, no commentary, no markdown fences',
    ].join('\n'),
    messages: [
      { role: 'user', content: `Tag items in this ${kind} file:\n\n${source}` },
    ],
  })

  const text = msg.content.map(b => b.type === 'text' ? b.text : '').join('')
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response for ${kind}`)
  return JSON.parse(match[0])
}

async function main() {
  const proposals = {}
  for (const [kind, filepath] of Object.entries(LIBRARY_PATHS)) {
    console.log(`Tagging ${kind}...`)
    try {
      proposals[kind] = await tagFile(kind, filepath)
      const count = Object.keys(proposals[kind]).length
      console.log(`  -> ${count} items tagged`)
    } catch (err) {
      console.error(`  -> FAILED:`, err.message)
      proposals[kind] = { error: err.message }
    }
  }
  fs.writeFileSync(
    'scripts/.bulk-tag-proposals.json',
    JSON.stringify(proposals, null, 2)
  )
  console.log('\nWrote scripts/.bulk-tag-proposals.json — review and merge manually.')
  console.log('\nTo merge: for each kind, copy each item-id key into the matching library entry as `tags: [...]`. Reject any tag IDs not in the taxonomy. Re-run typecheck after merge.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

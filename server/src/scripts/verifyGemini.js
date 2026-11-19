import { verifyGeminiConnection } from '../services/aiService.js'

/**
 * Diagnostic CLI script to verify Gemini API connectivity.
 * Usage:
 *   node server/src/scripts/verifyGemini.js
 *   npm --prefix server run verify:gemini
 */
async function run() {
  console.log('[TripMind Diagnostic] Initiating Google Gemini API connectivity smoke test...')

  const result = await verifyGeminiConnection()

  if (result.success) {
    console.log('[TripMind Diagnostic] SUCCESS: Gemini connection verified.')
    console.log(`  Provider:    ${result.data.provider}`)
    console.log(`  Model ID:    ${result.data.model}`)
    console.log(`  Prompt:      "${result.data.prompt}"`)
    console.log(`  Response:    "${result.data.response}"`)
    console.log(`  Latency:     ${result.data.latencyMs}ms`)
    console.log(`  Timestamp:   ${result.data.timestamp}`)
    process.exit(0)
  } else {
    console.error('[TripMind Diagnostic] BLOCKED: Gemini connection test could not be completed.')
    console.error(`  Error Code:  ${result.error.code}`)
    console.error(`  Message:     ${result.error.message}`)
    console.error(`  Model ID:    ${result.model}`)
    console.error(`  Timestamp:   ${result.timestamp}`)
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('[TripMind Diagnostic] Unexpected error during verification:', err.message)
  process.exit(1)
})

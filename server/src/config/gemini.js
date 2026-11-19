import { GoogleGenAI } from '@google/genai'
import { config, validateGeminiConfig } from './env.js'

/**
 * Cached singleton instance of the GoogleGenAI client.
 * Avoids instantiating a new client for every request.
 *
 * @type {GoogleGenAI | null}
 */
let clientInstance = null

/**
 * Returns the reusable GoogleGenAI client singleton.
 * Validates required Gemini environment variables prior to instantiation.
 *
 * @returns {GoogleGenAI} The initialized Google GenAI client
 */
export function getGeminiClient() {
  if (!clientInstance) {
    const { apiKey } = validateGeminiConfig()
    clientInstance = new GoogleGenAI({ apiKey })
  }
  return clientInstance
}

/**
 * Returns the configured Gemini model ID.
 * Defaults to 'gemini-3.5-flash-lite'.
 *
 * @returns {string} The model identifier
 */
export function getGeminiModel() {
  return config.geminiModel || 'gemini-3.5-flash-lite'
}

/**
 * Overrides or sets the cached Gemini client singleton.
 * Primarily used in automated tests to inject mock Gemini clients without network calls.
 *
 * @param {object|null} client - The client instance or mock
 */
export function setGeminiClient(client) {
  clientInstance = client
}

/**
 * Resets the cached Gemini client singleton.
 * Primarily used in automated tests and dynamic reconfiguration.
 */
export function resetGeminiClient() {
  clientInstance = null
}

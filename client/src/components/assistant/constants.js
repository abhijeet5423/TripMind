/**
 * AI Travel Assistant Constants & Utilities
 */

/**
 * Standard suggested questions for initial assistant engagement.
 */
export const SUGGESTED_QUESTIONS = [
  'Can you summarize my itinerary?',
  'Am I staying within my budget?',
  'Is my schedule too packed?',
  'What should I prepare for this trip?',
]

let messageCounter = 0

/**
 * Generates an incremental unique message ID.
 *
 * @param {'user' | 'assistant'} role
 * @returns {string} Unique message identifier
 */
export function generateMessageId(role = 'msg') {
  messageCounter += 1
  return `${role}_${messageCounter}`
}

/**
 * Formats current wall-clock time string (HH:MM AM/PM).
 *
 * @returns {string}
 */
export function getCurrentTimeString() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

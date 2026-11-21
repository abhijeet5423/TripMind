/**
 * AI Travel Assistant Request Validator
 *
 * Validates message payloads and bounded conversation history submitted to
 * POST /api/trips/:tripId/assistant/messages prior to controller and LLM dispatch.
 * Enforces strict typing, length constraints, role whitelisting, and standardized error envelopes.
 */

const VALID_ROLES = new Set(['user', 'assistant'])

/**
 * Validates assistant message request body.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function validateAssistantMessage(req, res, next) {
  // 1. Guard against missing or malformed request body
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body must be a valid JSON object',
        details: [],
      },
    })
  }

  const details = []

  // 2. Validate 'message' field
  const { message, history } = req.body

  if (message === undefined || message === null) {
    details.push({
      field: 'message',
      message: 'Message is required',
    })
  } else if (typeof message !== 'string') {
    details.push({
      field: 'message',
      message: 'Message must be a string',
    })
  } else {
    const trimmedMessage = message.trim()
    if (trimmedMessage.length === 0) {
      details.push({
        field: 'message',
        message: 'Message cannot be empty',
      })
    } else if (trimmedMessage.length > 1000) {
      details.push({
        field: 'message',
        message: 'Message cannot exceed 1000 characters',
      })
    } else {
      req.body.message = trimmedMessage
    }
  }

  // 3. Validate 'history' field (optional bounded history array)
  if (history !== undefined && history !== null) {
    if (!Array.isArray(history)) {
      details.push({
        field: 'history',
        message: 'History must be an array of message objects',
      })
    } else if (history.length > 6) {
      // Max 6 messages = 3 full conversational turns
      details.push({
        field: 'history',
        message: 'History cannot exceed 6 messages (3 conversation turns)',
      })
    } else {
      const cleanHistory = []
      let historyInvalid = false

      for (let i = 0; i < history.length; i++) {
        const item = history[i]
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          details.push({
            field: `history[${i}]`,
            message: 'Each history item must be an object with role and content',
          })
          historyInvalid = true
          break
        }

        const { role, content } = item

        // Validate role: strictly 'user' or 'assistant' (reject 'system', 'developer', 'model', etc.)
        if (typeof role !== 'string' || !VALID_ROLES.has(role.toLowerCase().trim())) {
          details.push({
            field: `history[${i}].role`,
            message: `History role must be either 'user' or 'assistant'`,
          })
          historyInvalid = true
          break
        }

        // Validate content
        if (typeof content !== 'string') {
          details.push({
            field: `history[${i}].content`,
            message: 'History item content must be a string',
          })
          historyInvalid = true
          break
        }

        const trimmedContent = content.trim()
        if (trimmedContent.length === 0) {
          details.push({
            field: `history[${i}].content`,
            message: 'History item content cannot be empty',
          })
          historyInvalid = true
          break
        }

        if (trimmedContent.length > 1000) {
          details.push({
            field: `history[${i}].content`,
            message: 'History item content cannot exceed 1000 characters',
          })
          historyInvalid = true
          break
        }

        cleanHistory.push({
          role: role.toLowerCase().trim(),
          content: trimmedContent,
        })
      }

      if (!historyInvalid) {
        req.body.history = cleanHistory
      }
    }
  } else {
    req.body.history = []
  }

  // 4. Halt and return HTTP 400 if validation errors exist
  if (details.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    })
  }

  next()
}

export default validateAssistantMessage

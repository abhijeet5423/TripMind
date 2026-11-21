import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  RotateCcw,
  Bot,
  User,
  Trash2,
  Compass,
} from 'lucide-react'
import MarkdownContent from './MarkdownContent.jsx'
import {
  SUGGESTED_QUESTIONS,
  generateMessageId,
  getCurrentTimeString,
} from './constants.js'
import * as assistantApi from '../../services/api/assistantApi.js'

/**
 * AI Travel Assistant Chat Interface Component
 *
 * Provides a context-aware conversational chat interface embedded within the
 * trip workspace, enabling travelers to ask questions grounded in their active
 * itinerary, budget summary, and travel preferences.
 *
 * Operational Guarantees:
 * - Scoped strictly to the active tripId with automated state reset on trip change.
 * - Stateless bounded history: Transmits at most 6 prior turns to the backend API.
 * - Anti-duplication: The latest query is sent as 'message' and excluded from 'history'.
 * - Robust error handling with in-place retry preserving conversational continuity.
 * - Accessible ARIA live region and full keyboard navigation (Enter to send, Shift+Enter for newline).
 *
 * @param {object} props
 * @param {object} props.trip - Active Mongoose Trip document or object
 * @param {string} [props.className=''] - Optional outer container styling classes
 * @param {boolean} [props.compact=false] - Optional compact mode for embedded launchers and drawers
 */
export default function AssistantChat({ trip, className = '', compact = false }) {
  const tripId = trip?._id || trip?.id
  const destination = trip?.destination || 'your destination'

  // Conversational state
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFailedMessage, setLastFailedMessage] = useState(null)

  // Track active tripId to reset conversation on trip change without effect setState
  const [prevTripId, setPrevTripId] = useState(tripId)
  const activeTripIdRef = useRef(tripId)

  useEffect(() => {
    activeTripIdRef.current = tripId
  }, [tripId])

  if (tripId !== prevTripId) {
    setPrevTripId(tripId)
    setMessages([])
    setInput('')
    setIsLoading(false)
    setError(null)
    setLastFailedMessage(null)
  }

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // ---------------------------------------------------------------------------
  // Auto-scroll to the latest message on updates
  // ---------------------------------------------------------------------------
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      scrollToBottom()
    }
  }, [messages, isLoading, scrollToBottom])

  // ---------------------------------------------------------------------------
  // Format trip metadata for initial welcome card
  // ---------------------------------------------------------------------------
  const partySize = trip?.numberOfTravellers || 1
  const partyStr = `${partySize} ${partySize === 1 ? 'traveler' : 'travelers'}`
  const currency = trip?.currency || 'USD'
  const budgetStr = trip?.budget ? `${trip.budget} ${currency}` : null

  // ---------------------------------------------------------------------------
  // Message Transmission Handler
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (textToSend, isRetry = false) => {
    const trimmed = (textToSend || input).trim()

    if (!trimmed || isLoading || !tripId) return

    // Capture the tripId at request dispatch to guard against stale responses
    const requestTripId = tripId

    // Enforce 1000 character maximum consistent with backend validator
    if (trimmed.length > 1000) {
      setError('Message exceeds the maximum limit of 1000 characters.')
      return
    }

    const timestamp = getCurrentTimeString()

    // If this is a new message (not a retry), append it to the conversational list
    if (!isRetry) {
      const userMessageObj = {
        id: generateMessageId('user'),
        role: 'user',
        content: trimmed,
        timestamp,
      }
      setMessages((prev) => [...prev, userMessageObj])
      setInput('')
    }

    setIsLoading(true)
    setError(null)
    setLastFailedMessage(null)

    // Construct bounded history payload:
    // Take previous messages (excluding errors and excluding the newest message being sent)
    const priorEligibleMessages = isRetry
      ? messages.slice(0, -1) // Exclude the failed user message already at the end
      : messages

    const boundedHistory = priorEligibleMessages
      .filter((m) => !m.isError && (m.role === 'user' || m.role === 'assistant'))
      .slice(-6)
      .map(({ role, content }) => ({
        role,
        content: content.slice(0, 1000),
      }))

    try {
      const response = await assistantApi.sendAssistantMessage(requestTripId, trimmed, boundedHistory)

      // Guard: If trip switched while request was in-flight, discard stale response
      if (activeTripIdRef.current !== requestTripId) {
        return
      }

      if (!response?.success) {
        throw new Error(response?.error?.message || response?.message || 'Failed to generate response.')
      }

      const replyText = response?.data?.reply || response?.data || response?.message || ''

      const assistantMessageObj = {
        id: generateMessageId('assistant'),
        role: 'assistant',
        content: replyText,
        timestamp: getCurrentTimeString(),
      }

      setMessages((prev) => [...prev, assistantMessageObj])
    } catch (err) {
      // Guard: If trip switched while request was in-flight, discard error
      if (activeTripIdRef.current !== requestTripId) {
        return
      }

      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Unable to reach your travel curator. Please verify your connection or try again.'

      setError(errorMessage)
      setLastFailedMessage(trimmed)
    } finally {
      if (activeTripIdRef.current === requestTripId) {
        setIsLoading(false)
        // Focus textarea on desktop after response
        if (textareaRef.current && typeof window !== 'undefined' && window.innerWidth >= 768) {
          textareaRef.current.focus()
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Retry Failed Query
  // ---------------------------------------------------------------------------
  const handleRetry = () => {
    if (lastFailedMessage && !isLoading) {
      handleSendMessage(lastFailedMessage, true)
    }
  }

  // ---------------------------------------------------------------------------
  // Reset Conversation Handler
  // ---------------------------------------------------------------------------
  const handleResetConversation = () => {
    setMessages([])
    setInput('')
    setError(null)
    setLastFailedMessage(null)
  }

  // ---------------------------------------------------------------------------
  // Keyboard event handler for textarea (Enter to send, Shift+Enter for newline)
  // ---------------------------------------------------------------------------
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(input)
    }
  }

  const isInputEmpty = input.trim().length === 0
  const isInputOverLimit = input.length > 1000

  return (
    <section
      aria-label="AI Travel Assistant"
      className={
        compact
          ? `bg-transparent p-0 space-y-3 ${className}`.trim()
          : `bg-white rounded-2xl border border-sage p-6 sm:p-8 shadow-[0_2px_8px_rgba(23,61,53,0.04)] space-y-6 ${className}`.trim()
      }
    >
      {/* 1. Assistant Module Header */}
      {!compact ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-sage/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0 mt-0.5 border border-forest/15">
              <Sparkles className="w-5 h-5 text-terracotta" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-forest">
                  AI Travel Assistant
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sand-ivory text-forest border border-sage">
                  Itinerary-Grounded
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone mt-0.5">
                Personalized advice and logistical guidance grounded in your {destination} itinerary.
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleResetConversation}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone hover:text-forest hover:bg-sand-ivory border border-sage transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Clear assistant conversation"
              >
                <Trash2 className="w-3.5 h-3.5 text-stone" />
                <span>Clear Chat</span>
              </button>
            )}

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sand-ivory border border-sage text-stone text-xs font-sans">
              <Compass className="w-3.5 h-3.5 text-terracotta shrink-0" />
              <span className="font-medium text-forest truncate max-w-[140px]">{destination}</span>
            </div>
          </div>
        </div>
      ) : (
        messages.length > 0 && (
          <div className="flex items-center justify-between pb-2 border-b border-sage/40">
            <span className="text-[11px] font-semibold text-stone uppercase tracking-wider">
              Grounded in {destination}
            </span>
            <button
              type="button"
              onClick={handleResetConversation}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-stone hover:text-forest hover:bg-sand-ivory border border-sage transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Clear assistant conversation"
            >
              <Trash2 className="w-3 h-3 text-stone" />
              <span>Clear Chat</span>
            </button>
          </div>
        )
      )}

      {/* 2. Welcome State & Suggested Questions (Rendered when conversation is empty) */}
      {messages.length === 0 && (
        <div className={`bg-sand-ivory/60 rounded-xl border border-sage/80 ${compact ? 'p-3.5 space-y-3' : 'p-5 sm:p-6 space-y-4'}`}>
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-forest text-sand-ivory flex items-center justify-center shrink-0 mt-0.5`}>
              <Bot className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            </div>
            <div className="space-y-1">
              <h4 className={`font-serif ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-bold text-forest`}>
                Hello! I am your TripMind travel curator.
              </h4>
              <p className={`font-sans ${compact ? 'text-xs' : 'text-xs sm:text-sm'} text-charcoal/85 leading-relaxed`}>
                I have full reference context on your planned journey to{' '}
                <strong className="text-forest">{destination}</strong>
                {budgetStr && <> (target budget: <strong className="text-forest">{budgetStr}</strong>)</>}{' '}
                for <span className="font-medium text-forest">{partyStr}</span>. Ask me about
                recommended pacing, dining ideas, transit advice, or budget checks.
              </p>
            </div>
          </div>

          {/* Suggested Questions Grid */}
          <div className="pt-1">
            <span className="text-[11px] font-bold text-stone uppercase tracking-wider block mb-2">
              Suggested Questions
            </span>
            <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-2 gap-2.5'}`}>
              {SUGGESTED_QUESTIONS.map((question, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(question)}
                  disabled={isLoading}
                  className="text-left p-2.5 sm:p-3 rounded-lg bg-white border border-sage hover:border-forest hover:bg-sand-ivory/50 transition-all text-xs text-charcoal/90 font-medium flex items-center justify-between group cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <span className="leading-snug">{question}</span>
                  <span className="text-terracotta opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-sm shrink-0 ml-2">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Conversational Message Stream */}
      {messages.length > 0 && (
        <div
          role="log"
          aria-live="polite"
          aria-label="Assistant conversation history"
          className={`${compact ? 'max-h-[260px] sm:max-h-[320px] p-3 space-y-3' : 'max-h-[460px] p-4 sm:p-5 space-y-4'} overflow-y-auto pr-1 sm:pr-2 border border-sage/60 rounded-xl bg-sand-ivory/20`}
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user'

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start items-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-forest text-sand-ivory flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-forest/15">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-2xs transition-all ${
                    isUser
                      ? 'bg-forest text-sand-ivory rounded-tr-xs'
                      : 'bg-white border border-sage text-charcoal rounded-tl-xs'
                  }`}
                >
                  {/* Speaker Label & Timestamp Header */}
                  <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-black/10">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isUser ? 'text-sand-ivory/80' : 'text-forest font-serif'
                      }`}
                    >
                      {isUser ? 'You' : 'TripMind Curator'}
                    </span>
                    {msg.timestamp && (
                      <span
                        className={`text-[10px] ${
                          isUser ? 'text-sand-ivory/60' : 'text-stone/70'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    )}
                  </div>

                  {/* Message Content Body */}
                  <div className="text-xs sm:text-sm leading-relaxed">
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sand-ivory border border-sage text-forest flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <User className="w-4 h-4 text-forest" />
                  </div>
                )}
              </div>
            )
          })}

          {/* In-Flight Assistant Typing / Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-2.5 sm:gap-3 justify-start animate-fadeIn" role="status" aria-label="Curator is thinking">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-forest text-sand-ivory flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-sage rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs text-stone flex items-center gap-3">
                <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse [animation-delay:200ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse [animation-delay:400ms]" />
                </span>
                <span className="text-xs font-medium">
                  Consulting your itinerary & travel context...
                </span>
              </div>
            </div>
          )}

          {/* Bottom scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 4. Error & Retry Banner */}
      {error && (
        <div
          role="alert"
          className="bg-burnt-crimson/5 border border-burnt-crimson/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm text-burnt-crimson animate-fadeIn"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-burnt-crimson shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-forest block">Unable to generate response</span>
              <p className="text-stone leading-relaxed">{error}</p>
            </div>
          </div>

          {lastFailedMessage && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-burnt-crimson text-white hover:bg-burnt-crimson/90 transition-all font-semibold text-xs shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Question</span>
            </button>
          )}
        </div>
      )}

      {/* 5. Message Input Form Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSendMessage(input)
        }}
        className="space-y-2 pt-1"
      >
        <div className="relative rounded-xl border border-sage bg-sand-ivory/30 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question about ${destination} (e.g., 'What should I pack?' or 'Is our pace too fast?')...`}
            disabled={isLoading}
            aria-label="Ask assistant a question"
            className="w-full bg-transparent px-3.5 pt-3 pb-9 text-xs sm:text-sm text-charcoal placeholder:text-stone/60 resize-none outline-none disabled:opacity-50"
          />

          {/* Input Footer: Character Counter & Send Button */}
          <div className="absolute bottom-2 left-3.5 right-2.5 flex items-center justify-between pointer-events-none">
            <span
              className={`text-[10px] font-mono pointer-events-auto ${
                isInputOverLimit
                  ? 'text-burnt-crimson font-bold'
                  : input.length > 900
                  ? 'text-ochre-gold font-medium'
                  : 'text-stone/60'
              }`}
            >
              {input.length}/1000
            </span>

            <button
              type="submit"
              disabled={isInputEmpty || isLoading || isInputOverLimit}
              aria-label="Send message to AI assistant"
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Input Helper Keyboard Hint */}
        <div className="flex items-center justify-between text-[11px] text-stone/70 px-1">
          <span className="hidden sm:inline">
            Press <kbd className="font-mono bg-sage/40 px-1 rounded text-[10px]">Enter</kbd> to send,{' '}
            <kbd className="font-mono bg-sage/40 px-1 rounded text-[10px]">Shift + Enter</kbd> for new line
          </span>
          <span className="text-right sm:text-left">
            Answers are grounded in your saved itinerary reference data.
          </span>
        </div>
      </form>
    </section>
  )
}

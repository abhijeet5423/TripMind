/**
 * Pure JavaScript Markdown Tokenizer & Block Parser
 *
 * Parses markdown text into structured token blocks (headings, lists, blockquotes, paragraphs, inline formatting)
 * without external dependencies, allowing unit testability in plain Node.js and lightweight React rendering.
 */

/**
 * Tokenizes inline formatting: bold, italic, inline code, and links.
 *
 * @param {string} text - Raw string
 * @returns {Array<{ type: 'text' | 'bold' | 'italic' | 'code' | 'link', content: string, url?: string }>}
 */
export function tokenizeInline(text) {
  if (!text || typeof text !== 'string') return []

  const tokens = []
  let remaining = text

  const inlineRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g
  let lastIndex = 0
  let match

  while ((match = inlineRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        content: remaining.slice(lastIndex, match.index),
      })
    }

    if (match[1]) {
      tokens.push({ type: 'bold', content: match[2] })
    } else if (match[3]) {
      tokens.push({ type: 'italic', content: match[4] })
    } else if (match[5]) {
      tokens.push({ type: 'code', content: match[6] })
    } else if (match[7]) {
      tokens.push({ type: 'link', content: match[8], url: match[9] })
    }

    lastIndex = inlineRegex.lastIndex
  }

  if (lastIndex < remaining.length) {
    tokens.push({
      type: 'text',
      content: remaining.slice(lastIndex),
    })
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', content: text }]
}

/**
 * Parses multiline markdown string into structured blocks.
 *
 * @param {string} content - Raw markdown response text
 * @returns {Array<{ type: 'h1' | 'h2' | 'h3' | 'blockquote' | 'ul' | 'ol' | 'p', content?: string, items?: string[], tokens?: Array }>}
 */
export function parseMarkdownBlocks(content) {
  if (!content || typeof content !== 'string') return []

  const lines = content.split('\n')
  const blocks = []
  let currentList = null
  let currentListType = null

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      blocks.push({
        type: currentListType,
        items: currentList.map((item) => ({
          raw: item,
          tokens: tokenizeInline(item),
        })),
      })
      currentList = null
      currentListType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      flushList()
      continue
    }

    // Header 3: ### Heading
    if (trimmed.startsWith('### ')) {
      flushList()
      const raw = trimmed.slice(4)
      blocks.push({
        type: 'h3',
        content: raw,
        tokens: tokenizeInline(raw),
      })
      continue
    }

    // Header 2: ## Heading
    if (trimmed.startsWith('## ')) {
      flushList()
      const raw = trimmed.slice(3)
      blocks.push({
        type: 'h2',
        content: raw,
        tokens: tokenizeInline(raw),
      })
      continue
    }

    // Header 1: # Heading
    if (trimmed.startsWith('# ')) {
      flushList()
      const raw = trimmed.slice(2)
      blocks.push({
        type: 'h1',
        content: raw,
        tokens: tokenizeInline(raw),
      })
      continue
    }

    // Blockquote: > text
    if (trimmed.startsWith('> ')) {
      flushList()
      const raw = trimmed.slice(2)
      blocks.push({
        type: 'blockquote',
        content: raw,
        tokens: tokenizeInline(raw),
      })
      continue
    }

    // Unordered list item: - item or * item
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (ulMatch) {
      if (currentListType && currentListType !== 'ul') {
        flushList()
      }
      currentListType = 'ul'
      if (!currentList) currentList = []
      currentList.push(ulMatch[1])
      continue
    }

    // Ordered list item: 1. item
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      if (currentListType && currentListType !== 'ol') {
        flushList()
      }
      currentListType = 'ol'
      if (!currentList) currentList = []
      currentList.push(olMatch[2])
      continue
    }

    // Standard paragraph line
    flushList()
    blocks.push({
      type: 'p',
      content: trimmed,
      tokens: tokenizeInline(trimmed),
    })
  }

  flushList()
  return blocks
}

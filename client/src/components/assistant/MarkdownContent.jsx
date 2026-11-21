import { parseMarkdownBlocks } from './markdownParser.js'

/**
 * Lightweight, Safe Zero-Dependency Markdown Formatter
 *
 * Formats parsed markdown block tokens into accessible semantic React elements
 * adhering to TripMind's editorial design system.
 */

function renderTokens(tokens) {
  if (!Array.isArray(tokens)) return null

  return tokens.map((token, idx) => {
    switch (token.type) {
      case 'bold':
        return (
          <strong key={idx} className="font-bold text-forest">
            {token.content}
          </strong>
        )
      case 'italic':
        return (
          <em key={idx} className="italic text-charcoal/90">
            {token.content}
          </em>
        )
      case 'code':
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-sage-light/60 border border-sage text-forest font-mono text-[12px]"
          >
            {token.content}
          </code>
        )
      case 'link': {
        const isSafe = token.url && /^https?:\/\//i.test(token.url)
        if (!isSafe) {
          return token.content
        }
        return (
          <a
            key={idx}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta hover:text-terracotta-dark underline font-medium"
          >
            {token.content}
          </a>
        )
      }
      case 'text':
      default:
        return token.content
    }
  })
}

/**
 * Parses and renders multiline markdown content into block-level elements.
 *
 * @param {object} props
 * @param {string} props.content - Raw markdown string
 * @returns {React.ReactNode} Formatted block elements
 */
export default function MarkdownContent({ content = '' }) {
  if (!content || typeof content !== 'string') {
    return null
  }

  const blocks = parseMarkdownBlocks(content)

  return (
    <div className="space-y-1.5">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h2
                key={idx}
                className="font-serif text-lg sm:text-xl font-bold text-forest mt-4.5 mb-2 first:mt-0"
              >
                {renderTokens(block.tokens)}
              </h2>
            )
          case 'h2':
            return (
              <h3
                key={idx}
                className="font-serif text-base sm:text-lg font-bold text-forest mt-4 mb-2 first:mt-0"
              >
                {renderTokens(block.tokens)}
              </h3>
            )
          case 'h3':
            return (
              <h4
                key={idx}
                className="font-serif text-sm sm:text-base font-bold text-forest mt-3.5 mb-1.5 first:mt-0"
              >
                {renderTokens(block.tokens)}
              </h4>
            )
          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-terracotta pl-3.5 py-1 my-2 italic text-xs sm:text-sm text-stone bg-sand-ivory/50 rounded-r-md"
              >
                {renderTokens(block.tokens)}
              </blockquote>
            )
          case 'ul':
            return (
              <ul
                key={idx}
                className="list-disc pl-5 space-y-1.5 my-2.5 text-xs sm:text-sm text-charcoal/90"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderTokens(item.tokens)}
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol
                key={idx}
                className="list-decimal pl-5 space-y-1.5 my-2.5 text-xs sm:text-sm text-charcoal/90"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderTokens(item.tokens)}
                  </li>
                ))}
              </ol>
            )
          case 'p':
          default:
            return (
              <p
                key={idx}
                className="text-xs sm:text-sm text-charcoal/90 leading-relaxed my-1.5 first:mt-0 last:mb-0"
              >
                {renderTokens(block.tokens)}
              </p>
            )
        }
      })}
    </div>
  )
}

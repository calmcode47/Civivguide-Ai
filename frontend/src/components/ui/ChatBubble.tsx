import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/types';
import LoadingDots from './LoadingDots';

// =============================================================================
// Helpers
// =============================================================================

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

// =============================================================================
// Sub-components
// =============================================================================

/** Gold star icon displayed beside the assistant label. */
function StarIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="#d4a017"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 0l1.35 4.15H12L8.33 6.71 9.68 11 6 8.44 2.32 11l1.35-4.29L0 4.15h4.65L6 0z" />
    </svg>
  );
}

// =============================================================================
// ChatBubble
// =============================================================================

interface ChatBubbleProps {
  message: Message;
  onRetry?: () => void;
}

export default function ChatBubble({ message, onRetry }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const hasError = !!message.error;
  
  // Handle case where timestamp might be a string (from LocalStorage)
  const timestamp = typeof message.timestamp === 'string' 
    ? new Date(message.timestamp) 
    : message.timestamp;

  // ---- Animation ------------------------------------------------------------
  const variants = {
    initial: {
      opacity: 0,
      x: isUser ? 20 : -20,
    },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        type: 'spring' as const,
        stiffness: 260,
        damping: 20,
      },
    },
  };

  // ---- Styles ---------------------------------------------------------------
  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isUser ? 'flex-end' : 'flex-start',
    maxWidth: '80%',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
  };

  const bubbleStyle: React.CSSProperties = isUser
    ? {
        background: 'rgba(212,160,23,0.08)',
        border: '1px solid rgba(212,160,23,0.2)',
        borderRadius: '1rem 1rem 0.25rem 1rem',
        padding: '0.75rem 1rem',
        color: '#e8ecf4',
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.9375rem',
        lineHeight: 1.6,
      }
    : {
        background: hasError ? 'rgba(239, 68, 68, 0.05)' : '#13172a',
        border: hasError ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #1e2340',
        borderRadius: '1rem 1rem 1rem 0.25rem',
        padding: '0.875rem 1.125rem',
        color: hasError ? '#fecaca' : '#e8ecf4',
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '0.9375rem',
        lineHeight: 1.7,
      };

  const labelStyle: React.CSSProperties = {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '0.75rem',
    color: '#7b8db0',
    marginBottom: '0.375rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  };

  const timestampStyle: React.CSSProperties = {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '0.7rem',
    color: '#7b8db0',
    marginTop: '0.375rem',
    textAlign: isUser ? 'right' : 'left',
  };

  return (
    <motion.article
      role="article"
      aria-label={`${isUser ? 'Your' : 'CivicMind'} message`}
      variants={variants}
      initial="initial"
      animate="animate"
      style={wrapperStyle}
    >
      {/* Speaker label */}
      <div style={labelStyle}>
        {!isUser && <StarIcon />}
        <span>{isUser ? 'You' : 'CivicMind'}</span>
        {hasError && <span className="text-[10px] text-danger font-bold ml-1 uppercase tracking-tighter">Connection Error</span>}
      </div>

      {/* Bubble */}
      <div style={bubbleStyle} className="group relative">
        {message.isStreaming ? (
          <LoadingDots aria-label="CivicMind is typing" />
        ) : isUser ? (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p style={{ margin: '0 0 0.5em', wordBreak: 'break-word' }}>{children}</p>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: hasError ? '#fecaca' : '#f0c040', fontWeight: 600 }}>{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ color: '#b0bcd4', fontStyle: 'italic' }}>{children}</em>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: '1.25rem', margin: '0.5em 0' }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: '1.25rem', margin: '0.5em 0' }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: '0.25em', color: '#e8ecf4' }}>{children}</li>
                ),
                code: ({ children }) => (
                  <code
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.8125em',
                      background: 'rgba(212,160,23,0.1)',
                      padding: '0.15em 0.4em',
                      borderRadius: '0.25em',
                      color: '#f0c040',
                    }}
                  >
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#d4a017', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>

            {hasError && onRetry && (
              <button
                onClick={onRetry}
                className="mt-1 self-start flex items-center gap-2 px-4 py-2 bg-danger/10 hover:bg-danger/20 border border-danger/30 rounded-full text-[11px] font-bold text-danger uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Retry Request
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <time
        dateTime={timestamp.toISOString()}
        style={timestampStyle}
        aria-label={`Sent at ${formatTime(timestamp)}`}
      >
        {formatTime(timestamp)}
      </time>
    </motion.article>
  );
}

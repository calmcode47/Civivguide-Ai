import { useMemo, useState } from 'react';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

import { TRANSLATION_LANGUAGES } from '@/config/assistant';
import { trackEvent } from '@/lib/analytics';
import apiClient from '@/lib/apiClient';
import type { ApiResponse, FeedbackPayload, Message, TranslatePayload } from '@/types';

import LoadingDots from './LoadingDots';

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

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

interface ChatBubbleProps {
  message: Message;
  sessionId?: string;
  translateEnabled?: boolean;
  onRetry?: () => void;
}

function MarkdownBlock({
  content,
  hasError,
}: {
  content: string;
  hasError: boolean;
}) {
  return (
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
      {content}
    </ReactMarkdown>
  );
}

export default function ChatBubble({
  message,
  sessionId,
  translateEnabled = false,
  onRetry,
}: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const hasError = Boolean(message.error);
  const timestamp = typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp;
  const [translationLanguage, setTranslationLanguage] =
    useState<(typeof TRANSLATION_LANGUAGES)[number]['code']>('hi');
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translatedLabel, setTranslatedLabel] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackState, setFeedbackState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const actionLanguages = useMemo(
    () => TRANSLATION_LANGUAGES.map((language) => ({ ...language })),
    []
  );

  const displayedContent = translatedContent ?? message.content;
  const canTranslate = translateEnabled && !isUser && !message.isStreaming && !hasError && message.content.trim().length > 0;
  const canRate = !isUser && !message.isStreaming && !hasError && Boolean(sessionId);

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

  const handleTranslate = async () => {
    if (!canTranslate) {
      return;
    }

    const selected = actionLanguages.find((language) => language.code === translationLanguage);
    setIsTranslating(true);
    setTranslationError(null);

    try {
      const response = await apiClient.post<ApiResponse<TranslatePayload>>('/api/translate', {
        text: message.content,
        target_language: translationLanguage,
      });
      setTranslatedContent(response.data.data.translated_text);
      setTranslatedLabel(selected?.label ?? translationLanguage);
      await trackEvent('translation_requested', {
        target_language: translationLanguage,
      });
    } catch (error) {
      setTranslationError(
        error instanceof Error ? error.message : 'Unable to translate this answer right now.'
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const submitFeedback = async () => {
    if (!sessionId || !feedbackRating || feedbackState === 'saving') {
      return;
    }

    setFeedbackState('saving');
    try {
      await apiClient.post<ApiResponse<FeedbackPayload>>('/api/feedback', {
        session_id: sessionId,
        rating: feedbackRating,
        comment: feedbackComment.trim() || null,
      });
      setFeedbackState('saved');
      await trackEvent('feedback_submitted', {
        rating: feedbackRating,
      });
    } catch {
      setFeedbackState('error');
    }
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
      <div style={labelStyle}>
        {!isUser && <StarIcon />}
        <span>{isUser ? 'You' : 'CivicMind'}</span>
        {hasError && (
          <span className="text-[10px] text-danger font-bold ml-1 uppercase tracking-tighter">
            Connection Error
          </span>
        )}
      </div>

      <div style={bubbleStyle} className="group relative">
        {message.isStreaming ? (
          <div role="status" aria-live="polite" aria-label="CivicMind is typing" className="flex flex-col gap-3">
            {message.content.trim().length > 0 ? (
              <div aria-live="polite">
                <MarkdownBlock content={message.content} hasError={hasError} />
              </div>
            ) : null}
            <LoadingDots />
          </div>
        ) : isUser ? (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {translatedContent && translatedLabel ? (
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-gold">
                <span>Translated to {translatedLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTranslatedContent(null);
                    setTranslatedLabel(null);
                    setTranslationError(null);
                  }}
                  className="rounded-full border border-gold/20 px-2 py-1 text-[10px] text-text-secondary hover:text-gold transition-colors"
                >
                  Show original
                </button>
              </div>
            ) : null}

            <div aria-live="polite">
              <MarkdownBlock content={displayedContent} hasError={hasError} />
            </div>

            {hasError && onRetry ? (
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
            ) : null}

            {canTranslate ? (
              <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-2">
                <label className="text-[10px] uppercase tracking-widest text-text-secondary" htmlFor={`translate-${message.id}`}>
                  Translate
                </label>
                <select
                  id={`translate-${message.id}`}
                  value={translationLanguage}
                  onChange={(event) => setTranslationLanguage(event.target.value as typeof translationLanguage)}
                  className="bg-void border border-border/40 rounded-lg px-2 py-1 text-[11px] text-text-primary"
                  aria-label="Choose translation language"
                >
                  {actionLanguages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="rounded-full border border-gold/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
                >
                  {isTranslating ? 'Translating...' : 'Translate'}
                </button>
                {translationError ? (
                  <span className="text-[11px] text-danger">{translationError}</span>
                ) : null}
              </div>
            ) : null}

            {canRate ? (
              <div className="pt-2 border-t border-border/40 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                    Was this useful?
                  </span>
                  <button
                    type="button"
                    aria-label="Submit positive feedback"
                    onClick={() => {
                      setFeedbackRating(5);
                      setFeedbackState('idle');
                    }}
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      feedbackRating === 5
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border/40 text-text-secondary hover:text-gold hover:border-gold/30'
                    }`}
                  >
                    Helpful
                  </button>
                  <button
                    type="button"
                    aria-label="Submit negative feedback"
                    onClick={() => {
                      setFeedbackRating(2);
                      setFeedbackState('idle');
                    }}
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      feedbackRating === 2
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border/40 text-text-secondary hover:text-gold hover:border-gold/30'
                    }`}
                  >
                    Needs work
                  </button>
                </div>

                {feedbackRating ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      rows={2}
                      value={feedbackComment}
                      onChange={(event) => setFeedbackComment(event.target.value)}
                      maxLength={500}
                      placeholder="Optional note for this answer"
                      className="w-full bg-void border border-border/40 rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50"
                      aria-label="Optional feedback note"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={submitFeedback}
                        disabled={feedbackState === 'saving'}
                        className="rounded-full border border-gold/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
                      >
                        {feedbackState === 'saving' ? 'Saving...' : 'Submit feedback'}
                      </button>
                      {feedbackState === 'saved' ? (
                        <span className="text-[11px] text-teal-300">Feedback saved</span>
                      ) : null}
                      {feedbackState === 'error' ? (
                        <span className="text-[11px] text-danger">Could not save feedback</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <time dateTime={timestamp.toISOString()} style={timestampStyle} aria-label={`Sent at ${formatTime(timestamp)}`}>
        {formatTime(timestamp)}
      </time>
    </motion.article>
  );
}

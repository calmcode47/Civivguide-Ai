import { startTransition, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import SEO from '@/components/SEO';
import { STAGE_CONTEXTS, USER_CONTEXTS } from '@/config/assistant';
import { useApiHealth } from '@/hooks/useApiHealth';
import { useChat } from '@/hooks/useChat';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSuggestions } from '@/hooks/useSuggestions';
import { trackEvent } from '@/lib/analytics';
import apiClient from '@/lib/apiClient';
import { useChatStore } from '@/store/useChatStore';
import type {
  ApiResponse,
  SessionDetailPayload,
  SessionListPayload,
  StageContext,
} from '@/types';
import { ChatBubble, ErrorBanner, GoldButton } from '@/components/ui';

const DEFAULT_STAGE_CONTEXT: StageContext = 'Pre-Announcement';

function ShieldIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="#d4a017"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8v4M12 16h.01"
        stroke="#d4a017"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function normalizeStageParam(value: string | null): StageContext | null {
  if (
    value === 'Pre-Announcement' ||
    value === 'Registration & Roll Check' ||
    value === 'Campaign Period' ||
    value === 'Polling Day' ||
    value === 'Counting & Results'
  ) {
    return value;
  }
  return null;
}

export default function AssistantPage() {
  const {
    sessions,
    activeSessionId,
    getActiveSession,
    initSession,
    createNewSession,
    hydrateSessionsFromServer,
    syncSessionDetail,
    switchSession,
    deleteSessionLocal,
    clearAllSessions,
    setUserContext,
    setStageContext,
    error: chatError,
    setError: setChatError,
  } = useChatStore();

  const { sendMessage, isLoading } = useChat();
  const { isOnline } = useNetworkStatus();
  const { isReachable, geminiReady, translateReady, firestoreMode, isChecking } = useApiHealth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSyncingSessions, setIsSyncingSessions] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const session = getActiveSession();
  const currentUserContext = session?.userContext ?? 'First-Time Voter';
  const currentStageContext = session?.stageContext ?? DEFAULT_STAGE_CONTEXT;
  const { suggestions, isLoading: suggestionsLoading } = useSuggestions(
    currentUserContext,
    currentStageContext
  );

  const messages = session?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const showFollowUpSuggestions =
    !isLoading &&
    lastMessage?.role === 'assistant' &&
    Array.isArray(lastMessage.suggestions) &&
    lastMessage.suggestions.length > 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hydratedSessionIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (isChecking || !isReachable) {
      return;
    }

    let active = true;

    const loadSessions = async () => {
      setIsSyncingSessions(true);
      try {
        const response = await apiClient.get<ApiResponse<SessionListPayload>>('/api/sessions');
        if (!active) {
          return;
        }
        startTransition(() => {
          hydrateSessionsFromServer(response.data.data.sessions ?? []);
        });
        setSyncMessage(
          response.data.data.sessions.length > 0
            ? 'Sessions loaded from Firestore.'
            : 'Ready to save new conversations to Firestore.'
        );
      } catch {
        if (active) {
          setSyncMessage('Using offline cache until the backend responds again.');
        }
      } finally {
        if (active) {
          setIsSyncingSessions(false);
        }
      }
    };

    void loadSessions();

    return () => {
      active = false;
    };
  }, [hydrateSessionsFromServer, isChecking, isReachable]);

  useEffect(() => {
    if (isChecking || !isReachable || !activeSessionId || hydratedSessionIds.current.has(activeSessionId)) {
      return;
    }

    let active = true;

    const loadSessionDetail = async () => {
      try {
        const response = await apiClient.get<ApiResponse<SessionDetailPayload>>(
          `/api/sessions/${activeSessionId}`
        );
        if (!active) {
          return;
        }
        hydratedSessionIds.current.add(activeSessionId);
        startTransition(() => {
          syncSessionDetail(response.data.data);
        });
      } catch {
        // Local drafts may not exist remotely yet. Keep them as offline cache.
      }
    };

    void loadSessionDetail();

    return () => {
      active = false;
    };
  }, [activeSessionId, isChecking, isReachable, syncSessionDetail]);

  useEffect(() => {
    const prefill = searchParams.get('prefill')?.trim() ?? '';
    const prefillSessionId = searchParams.get('sessionId');
    const stageParam = normalizeStageParam(searchParams.get('stage'));

    if (stageParam && session?.stageContext !== stageParam) {
      setStageContext(stageParam);
    }

    if (!prefill || !session || isLoading) {
      return;
    }

    if (!prefillSessionId) {
      const targetSessionId =
        session.messages.length > 0
          ? createNewSession(session.userContext, stageParam ?? session.stageContext)
          : session.id;
      const nextParams = new URLSearchParams();
      nextParams.set('prefill', prefill);
      nextParams.set('sessionId', targetSessionId);
      if (stageParam) {
        nextParams.set('stage', stageParam);
      }
      setSearchParams(nextParams, { replace: true });
      return;
    }

    if (session.id !== prefillSessionId) {
      startTransition(() => {
        switchSession(prefillSessionId);
      });
      return;
    }

    const alreadyQueued = session.messages.some(
      (message) => message.role === 'user' && message.content === prefill
    );
    if (alreadyQueued) {
      setSearchParams({}, { replace: true });
      return;
    }

    void sendMessage(prefill);
    setSearchParams({}, { replace: true });
  }, [
    createNewSession,
    isLoading,
    searchParams,
    sendMessage,
    session,
    setSearchParams,
    setStageContext,
    switchSession,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) {
      return;
    }
    void sendMessage(inputValue);
    setInputValue('');
  };

  const handleCreateNewSession = () => {
    createNewSession(currentUserContext, currentStageContext);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (isReachable) {
      try {
        await apiClient.delete(`/api/sessions/${sessionId}`);
      } catch {
        // Preserve local cleanup even when the remote session is already gone.
      }
    }

    hydratedSessionIds.current.delete(sessionId);
    deleteSessionLocal(sessionId);
    await trackEvent('session_deleted', {
      used_remote_delete: isReachable,
    });
  };

  const handleDeleteCurrentSession = () => {
    if (!activeSessionId) {
      return;
    }
    void handleDeleteSession(activeSessionId);
  };

  const handleClearOfflineCache = async () => {
    hydratedSessionIds.current.clear();
    clearAllSessions();
    if (isReachable) {
      try {
        const response = await apiClient.get<ApiResponse<SessionListPayload>>('/api/sessions');
        hydrateSessionsFromServer(response.data.data.sessions ?? []);
      } catch {
        setSyncMessage('Cleared local cache. Remote sessions will return when the backend is reachable.');
      }
    }
  };

  const getSessionTitle = (title: string | undefined, firstUserMessage: string | undefined) => {
    if (title && title !== 'New conversation') {
      return title;
    }
    if (!firstUserMessage) {
      return 'New conversation';
    }
    return firstUserMessage.length > 32 ? `${firstUserMessage.slice(0, 29)}...` : firstUserMessage;
  };

  const renderSuggestions = (items: string[]) => (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => void sendMessage(suggestion)}
          className="rounded-full border border-border bg-abyss/40 px-4 py-2 text-sm text-text-secondary backdrop-blur-sm transition-all hover:border-gold hover:text-gold"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <SEO
        title="Election Assistant"
        description="Ask clear questions about voter enrolment, EVM and VVPAT, election timelines, nomination, polling day, and result procedures in India."
        path="/assistant"
      />

      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 296 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="relative z-30 hidden flex-col border-r border-border bg-abyss/40 md:flex"
        aria-label="Conversation sidebar"
      >
        <div className="border-b border-border p-4">
          <button
            onClick={handleCreateNewSession}
            className="flex w-full items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm font-bold uppercase tracking-widest text-gold transition-all hover:bg-gold/10"
          >
            <PlusIcon />
            New Chat
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-2 custom-scrollbar">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-50">
            Recent Conversations
          </div>
          <ul className="space-y-1" aria-label="Saved conversations">
            {sessions.map((item) => {
              const firstUserMessage = item.messages.find((message) => message.role === 'user');
              return (
                <li key={item.id}>
                  <div
                    className={`group flex items-center gap-2 rounded-lg border px-2 py-2 transition-all ${
                      activeSessionId === item.id
                        ? 'border-gold/20 bg-gold/10 text-gold'
                        : 'border-transparent text-text-secondary hover:bg-surface/50 hover:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          switchSession(item.id);
                        });
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      aria-current={activeSessionId === item.id ? 'true' : undefined}
                    >
                      <MessageIcon />
                      <span className="truncate text-xs font-medium">
                        {getSessionTitle(item.title, firstUserMessage?.content)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSession(item.id)}
                      className="rounded-md p-1 opacity-70 transition-all hover:text-danger group-hover:opacity-100"
                      aria-label={`Delete conversation ${getSessionTitle(
                        item.title,
                        firstUserMessage?.content
                      )}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-4 border-t border-border p-4">
          <div className="space-y-3 rounded-2xl border border-border/40 bg-void/60 p-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
              <span className="text-text-secondary">Assistant Mode</span>
              <span className="text-gold">Guest</span>
            </div>
            <div className="text-xs leading-relaxed text-text-secondary">
              When the backend is live, conversations sync to Firestore. Local storage remains an
              offline cache so you can keep working during brief outages.
            </div>
            <div className="flex flex-wrap gap-2" aria-live="polite">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-text-secondary">
                {geminiReady ? 'Gemini Ready' : 'Fallback Guidance'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-text-secondary">
                {firestoreMode === 'firestore' ? 'Firestore Sync' : 'Memory Store'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-text-secondary">
                {translateReady ? 'Translate Ready' : 'Translate Offline'}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-text-secondary/60">
              {isSyncingSessions
                ? 'Refreshing backend sessions...'
                : syncMessage ?? 'Ready for secure, non-partisan election guidance.'}
            </p>
          </div>

          <button
            onClick={() => void handleClearOfflineCache()}
            className="flex w-full items-center justify-center gap-2 border-t border-border/20 pt-2 text-[9px] font-bold uppercase tracking-widest text-text-secondary/50 transition-colors hover:text-danger"
          >
            <TrashIcon />
            Clear Offline Cache
          </button>
        </div>
      </motion.aside>

      <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-void-radial">
        <div className="pointer-events-none absolute inset-0 z-0 bg-void-radial opacity-50" />

        <div className="relative z-20 flex items-center justify-between border-b border-border bg-void/90 px-6 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((value) => !value)}
              className="hidden rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:border-gold hover:text-gold md:flex"
              aria-label={isSidebarOpen ? 'Collapse conversation sidebar' : 'Expand conversation sidebar'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div>
              <span className="font-medium text-white">India Election Assistant</span>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary/60">
                Context-aware guidance for {currentStageContext}
              </p>
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={handleCreateNewSession}
              className="rounded-full border border-gold/20 bg-gold/10 p-2 text-gold"
              aria-label="Start a new chat"
            >
              <PlusIcon />
            </button>
          </div>

          <GoldButton
            variant="ghost"
            size="sm"
            onClick={handleDeleteCurrentSession}
            className="hidden sm:flex"
          >
            <TrashIcon />
            <span>Delete Session</span>
          </GoldButton>
        </div>

        <div className="relative z-10 border-b border-border/40 bg-void/60 px-6 py-3 shadow-inner backdrop-blur-md">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gold opacity-80">
                User Context
              </span>
              <div role="group" aria-label="Select your assistant context" className="flex items-center gap-2">
                {USER_CONTEXTS.map((context) => (
                  <button
                    key={context}
                    onClick={() => setUserContext(context)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      currentUserContext === context
                        ? 'scale-105 border-gold bg-gold text-void shadow-gold-glow'
                        : 'border-border/60 bg-abyss/30 text-text-secondary hover:border-gold/40 hover:text-gold'
                    }`}
                    aria-pressed={currentUserContext === context}
                  >
                    {context}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gold opacity-80">
                Election Stage
              </span>
              <div role="group" aria-label="Select the election stage" className="flex items-center gap-2">
                {STAGE_CONTEXTS.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setStageContext(stage)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      currentStageContext === stage
                        ? 'scale-105 border-gold bg-gold/15 text-gold'
                        : 'border-border/60 bg-abyss/30 text-text-secondary hover:border-gold/40 hover:text-gold'
                    }`}
                    aria-pressed={currentStageContext === stage}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="relative z-10 flex-1 overflow-y-auto scroll-smooth px-4 py-8">
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
            <AnimatePresence initial={false} mode="wait">
              {messages.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <ShieldIcon />
                  <h2 className="mt-6 mb-2 text-2xl font-display text-white">
                    Ask about voter enrolment, polling, EVM, or result stages
                  </h2>
                  <p className="max-w-md text-text-secondary">
                    CivicMind adapts its guidance to both your role and the current election stage so
                    the next steps stay practical and non-partisan.
                  </p>
                  {suggestionsLoading ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-9 w-36 animate-pulse rounded-full bg-border/40" />
                      ))}
                    </div>
                  ) : (
                    renderSuggestions(suggestions)
                  )}
                </motion.div>
              ) : (
                <div key="messages-list" className="flex flex-col gap-8">
                  {messages.map((message, index) => {
                    const onRetry =
                      message.role === 'assistant' && message.error
                        ? () => {
                            const previousUserMessage = messages[index - 1];
                            if (previousUserMessage?.role === 'user') {
                              void sendMessage(previousUserMessage.content, true);
                            }
                          }
                        : undefined;

                    return (
                      <ChatBubble
                        key={message.id}
                        message={message}
                        sessionId={session?.id}
                        translateEnabled={translateReady}
                        onRetry={onRetry}
                      />
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            {showFollowUpSuggestions ? renderSuggestions(lastMessage.suggestions ?? []) : null}
            <div ref={scrollRef} className="h-4" />
          </div>
        </section>

        <section className="relative z-20 border-t border-border bg-void/90 p-4 backdrop-blur-xl">
          <AnimatePresence>
            {!isChecking && ((!isReachable && isOnline) || (!geminiReady && isReachable) || !translateReady) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mx-auto mb-3 w-full max-w-[760px] overflow-hidden"
              >
                <div
                  className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500"
                  role="status"
                  aria-live="polite"
                >
                  <span className="mt-0.5">!</span>
                  <span>
                    {!isReachable
                      ? 'Backend is unreachable. The assistant will keep your local draft cache, but live Firestore sync is paused.'
                      : !geminiReady
                      ? 'Gemini is temporarily unavailable, so CivicMind is using its built-in procedural fallback.'
                      : 'Translate is temporarily unavailable. Core assistant guidance and Firestore sync still work.'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mx-auto w-full max-w-[760px]">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-text-secondary/70">
              <span className="rounded-full border border-white/10 px-2 py-1">
                {currentUserContext}
              </span>
              <span className="rounded-full border border-white/10 px-2 py-1">
                {currentStageContext}
              </span>
              <span className="rounded-full border border-white/10 px-2 py-1">
                {isReachable ? 'Backend Live' : 'Offline Cache'}
              </span>
            </div>

            <div className="flex items-end gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputValue}
                  onChange={(event) => {
                    setInputValue(event.target.value);
                    event.target.style.height = 'auto';
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Ask a ${currentStageContext.toLowerCase()} question about enrolment, polling, nominations, or counting.`}
                  className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3.5 font-body text-[0.95rem] text-text-primary placeholder-text-secondary/50 transition-all focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold-glow"
                  style={{ minHeight: '54px' }}
                  aria-label="Ask CivicMind a question"
                />
                <div className="pointer-events-none absolute right-3 bottom-3 hidden text-[10px] font-mono uppercase tracking-widest text-text-secondary/30 sm:block">
                  Ctrl/Cmd + K
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  !inputValue.trim() || isLoading
                    ? 'cursor-not-allowed bg-muted text-text-secondary opacity-50'
                    : 'bg-gold-gradient text-void shadow-gold-glow hover:scale-105 hover:brightness-110'
                }`}
                aria-label="Send message"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-void/30 border-t-void" />
                ) : (
                  <SendIcon />
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {chatError ? <ErrorBanner message={chatError} onDismiss={() => setChatError(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}

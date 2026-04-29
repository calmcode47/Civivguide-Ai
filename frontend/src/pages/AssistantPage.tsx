import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import SEO from '@/components/SEO';
import { ChatBubble, ErrorBanner, GoldButton } from '@/components/ui';
import { useApiHealth } from '@/hooks/useApiHealth';
import { useChat } from '@/hooks/useChat';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSuggestions } from '@/hooks/useSuggestions';
import { useChatStore } from '@/store/useChatStore';

const CONTEXTS = [
  'First-Time Voter',
  'Returning Voter',
  'Candidate',
  'Observer',
];

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
      <path d="M12 8v4M12 16h.01" stroke="#d4a017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function AssistantPage() {
  const {
    sessions,
    activeSessionId,
    getActiveSession,
    initSession,
    createNewSession,
    switchSession,
    deleteSession,
    clearAllSessions,
    setUserContext,
    error: chatError,
    setError: setChatError,
  } = useChatStore();

  const { sendMessage, isLoading } = useChat();
  const { isOnline } = useNetworkStatus();
  const { isReachable, geminiReady, firestoreMode, isChecking } = useApiHealth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const session = getActiveSession();
  const { suggestions, isLoading: suggestionsLoading } = useSuggestions(session?.userContext ?? 'general');
  const messages = session?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const showFollowUpSuggestions =
    !isLoading && lastMessage?.role === 'assistant' && Array.isArray(lastMessage.suggestions) && lastMessage.suggestions.length > 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isChecking) {
      initSession();
    }
  }, [initSession, isChecking]);

  useEffect(() => {
    const prefill = searchParams.get('prefill')?.trim() ?? '';
    const prefillSessionId = searchParams.get('sessionId');

    if (!prefill) {
      return;
    }

    if (!session || isLoading) return;

    if (!prefillSessionId) {
      const targetSessionId =
        session.messages.length > 0 ? createNewSession(session.userContext) : session.id;
      setSearchParams({ prefill, sessionId: targetSessionId }, { replace: true });
      return;
    }

    if (prefillSessionId && session.id !== prefillSessionId) {
      switchSession(prefillSessionId);
      return;
    }

    const alreadyQueued = session.messages.some((message) => message.role === 'user' && message.content === prefill);
    if (alreadyQueued) {
      setSearchParams({}, { replace: true });
      return;
    }

    sendMessage(prefill);
    setSearchParams({}, { replace: true });
  }, [createNewSession, isLoading, searchParams, sendMessage, session, setSearchParams, switchSession]);

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
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleDeleteCurrentSession = () => {
    if (!activeSessionId) return;
    deleteSession(activeSessionId);
  };

  const getSessionTitle = (sessionTitle: string | undefined, content: string | undefined) => {
    if (sessionTitle && sessionTitle !== 'New conversation') return sessionTitle;
    if (!content) return 'New conversation';
    return content.length > 32 ? `${content.slice(0, 29)}...` : content;
  };

  const renderSuggestions = (items: string[]) => (
    <div className="flex flex-wrap gap-2 mt-4">
      {items.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => sendMessage(suggestion)}
          className="px-4 py-2 rounded-full border border-border text-text-secondary text-sm hover:border-gold hover:text-gold transition-all backdrop-blur-sm bg-abyss/40"
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
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="hidden md:flex flex-col border-r border-border bg-abyss/40 relative z-30"
      >
        <div className="p-4 border-b border-border">
          <button
            onClick={() => createNewSession()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 transition-all font-bold text-sm uppercase tracking-widest"
          >
            <PlusIcon />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <div className="px-3 py-2 text-[10px] text-text-secondary uppercase tracking-widest font-bold opacity-50">
            Recent Conversations
          </div>
          {sessions.map((item) => {
            const firstUserMessage = item.messages.find((message) => message.role === 'user');
            return (
              <div
                key={item.id}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  activeSessionId === item.id
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-text-secondary hover:bg-surface/50 hover:text-white'
                }`}
                onClick={() => switchSession(item.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageIcon />
                  <span className="text-xs truncate font-medium">
                    {getSessionTitle(item.title, firstUserMessage?.content)}
                  </span>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteSession(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-danger transition-all"
                  aria-label="Delete conversation"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border space-y-4">
          <div className="rounded-2xl border border-border/40 bg-void/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold">
              <span className="text-text-secondary">Assistant Mode</span>
              <span className="text-gold">Guest</span>
            </div>
            <div className="text-xs text-text-secondary leading-relaxed">
              Sessions stay in your browser and can be mirrored to Firestore when backend credentials are configured.
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-text-secondary uppercase tracking-wider">
                {geminiReady ? 'Gemini Ready' : 'Fallback Mode'}
              </span>
              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-text-secondary uppercase tracking-wider">
                {firestoreMode === 'firestore' ? 'Firestore' : 'Memory Store'}
              </span>
            </div>
          </div>

          <button
            onClick={clearAllSessions}
            className="w-full text-[9px] text-text-secondary/50 hover:text-danger transition-colors uppercase tracking-widest font-bold flex items-center justify-center gap-2 pt-2 border-t border-border/20"
          >
            <TrashIcon />
            Purge Local History
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-void-radial">
        <div className="absolute inset-0 bg-void-radial pointer-events-none z-0 opacity-50" />

        <div className="relative z-20 flex items-center justify-between px-6 py-3 border-b border-border bg-void/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((value) => !value)}
              className="hidden md:flex p-1.5 rounded-lg border border-border hover:border-gold transition-colors text-text-secondary hover:text-gold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <span className="text-white font-medium">India Election Assistant</span>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => createNewSession()}
              className="p-2 rounded-full bg-gold/10 text-gold border border-gold/20"
              aria-label="Start a new chat"
            >
              <PlusIcon />
            </button>
          </div>

          <GoldButton variant="ghost" size="sm" onClick={handleDeleteCurrentSession} className="hidden sm:flex">
            <TrashIcon />
            <span>Delete Session</span>
          </GoldButton>
        </div>

        <div className="relative z-10 border-b border-border/40 bg-void/60 backdrop-blur-md px-6 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-inner">
          <span className="text-[10px] text-gold font-bold uppercase tracking-widest shrink-0 opacity-80">
            User Context
          </span>
          <div role="group" aria-label="Select your assistant context" className="flex items-center gap-2">
            {CONTEXTS.map((context) => (
              <button
                key={context}
                onClick={() => setUserContext(context)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                  session?.userContext === context
                    ? 'bg-gold text-void border-gold shadow-gold-glow scale-105'
                    : 'border-border/60 text-text-secondary hover:border-gold/40 hover:text-gold bg-abyss/30'
                }`}
              >
                {context}
              </button>
            ))}
          </div>
        </div>

        <section className="flex-1 overflow-y-auto scroll-smooth relative z-10 px-4 py-8">
          <div className="max-w-[760px] mx-auto w-full flex flex-col gap-8">
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
                  <h2 className="text-2xl font-display text-white mt-6 mb-2">
                    Ask about voter enrolment, polling, EVM, or election stages
                  </h2>
                  <p className="text-text-secondary max-w-sm">
                    This assistant explains Indian election procedures in a step-by-step, non-partisan way.
                  </p>
                  {suggestionsLoading ? (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="w-36 h-9 rounded-full bg-border/40 animate-pulse" />
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
                              sendMessage(previousUserMessage.content, true);
                            }
                          }
                        : undefined;

                    return <ChatBubble key={message.id} message={message} onRetry={onRetry} />;
                  })}
                </div>
              )}
            </AnimatePresence>

            {showFollowUpSuggestions ? renderSuggestions(lastMessage.suggestions ?? []) : null}
            <div ref={scrollRef} className="h-4" />
          </div>
        </section>

        <section className="relative z-20 border-t border-border bg-void/90 backdrop-blur-xl p-4">
          <AnimatePresence>
            {!isChecking && (!isReachable || !geminiReady) && isOnline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="max-w-[760px] mx-auto w-full mb-3 overflow-hidden"
              >
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3 text-amber-500 text-xs">
                  <span className="mt-0.5">!</span>
                  <span>
                    {!isReachable
                      ? 'Backend is unreachable. Check the Cloud Run or local API service.'
                      : 'Gemini is not configured yet, so the app is using the built-in fallback guidance.'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-[760px] mx-auto w-full flex items-end gap-3">
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
                placeholder="Ask about Form 6, polling booth checks, EVM and VVPAT, nomination, or counting."
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3.5 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-gold focus:ring-4 focus:ring-gold-glow transition-all resize-none font-body text-[0.95rem]"
                style={{ minHeight: '54px' }}
              />
              <div className="absolute right-3 bottom-3 hidden sm:block text-[10px] text-text-secondary/30 pointer-events-none uppercase tracking-widest font-mono">
                Ctrl/Cmd + K
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
                !inputValue.trim() || isLoading
                  ? 'bg-muted text-text-secondary cursor-not-allowed opacity-50'
                  : 'bg-gold-gradient text-void hover:scale-105 hover:brightness-110 shadow-gold-glow'
              }`}
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-void/30 border-t-void rounded-full animate-spin" />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {chatError ? <ErrorBanner message={chatError} onDismiss={() => setChatError(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}

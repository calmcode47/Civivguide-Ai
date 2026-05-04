import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import type {
  ChatSession,
  Message,
  SessionDetailPayload,
  SessionSummary,
  StageContext,
  UserContext,
} from '@/types';

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  isInitialised: boolean;
  error: string | null;
}

interface ChatActions {
  getActiveSession: () => ChatSession | null;
  initSession: () => void;
  createNewSession: (userContext?: UserContext, stageContext?: StageContext) => string;
  hydrateSessionsFromServer: (sessions: SessionSummary[]) => void;
  syncSessionDetail: (detail: SessionDetailPayload) => void;
  switchSession: (id: string) => void;
  deleteSessionLocal: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string | null;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  setUserContext: (context: UserContext) => void;
  setStageContext: (stageContext: StageContext) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearAllSessions: () => void;
}

const DEFAULT_USER_CONTEXT: UserContext = 'First-Time Voter';
const DEFAULT_STAGE_CONTEXT: StageContext = 'Pre-Announcement';

const buildSession = (
  userContext: UserContext = DEFAULT_USER_CONTEXT,
  stageContext: StageContext = DEFAULT_STAGE_CONTEXT
): ChatSession => ({
  id: `session_${uuidv4()}`,
  messages: [],
  userContext,
  stageContext,
  createdAt: new Date(),
  updatedAt: new Date(),
  title: 'New conversation',
  messageCount: 0,
});

const initialState: ChatState = {
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  isInitialised: false,
  error: null,
};

function normalizeUserContext(context: string | undefined): UserContext {
  if (context === 'Returning Voter' || context === 'Candidate' || context === 'Observer') {
    return context;
  }
  return DEFAULT_USER_CONTEXT;
}

function normalizeStageContext(stageContext: string | null | undefined): StageContext {
  if (
    stageContext === 'Registration & Roll Check' ||
    stageContext === 'Campaign Period' ||
    stageContext === 'Polling Day' ||
    stageContext === 'Counting & Results'
  ) {
    return stageContext;
  }
  return DEFAULT_STAGE_CONTEXT;
}

function mapSummaryToSession(summary: SessionSummary, existing?: ChatSession): ChatSession {
  return {
    id: summary.id,
    title: summary.title,
    messages: existing?.messages ?? [],
    userContext: normalizeUserContext(summary.user_context),
    stageContext: normalizeStageContext(summary.stage_context),
    createdAt: existing?.createdAt ?? summary.updated_at,
    updatedAt: summary.updated_at,
    messageCount: summary.message_count,
  };
}

function mapDetailToMessages(detail: SessionDetailPayload): Message[] {
  return detail.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
  }));
}

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((session) => session.id === activeSessionId) ?? null;
      },

      initSession: () => {
        const { isInitialised, sessions, activeSessionId } = get();
        if (isInitialised) {
          return;
        }

        if (sessions.length === 0) {
          const session = buildSession();
          set({
            sessions: [session],
            activeSessionId: session.id,
            isInitialised: true,
          });
          return;
        }

        set({
          activeSessionId: activeSessionId ?? sessions[0].id,
          isInitialised: true,
        });
      },

      createNewSession: (userContext = DEFAULT_USER_CONTEXT, stageContext = DEFAULT_STAGE_CONTEXT) => {
        const session = buildSession(userContext, stageContext);
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
          error: null,
        }));
        return session.id;
      },

      hydrateSessionsFromServer: (summaries) => {
        set((state) => {
          const existingById = new Map(state.sessions.map((session) => [session.id, session]));
          const hydrated = summaries.map((summary) =>
            mapSummaryToSession(summary, existingById.get(summary.id))
          );

          const localDrafts = state.sessions.filter(
            (session) =>
              !hydrated.some((candidate) => candidate.id === session.id) &&
              (session.messageCount ?? session.messages.length) === 0
          );

          const nextSessions = hydrated.length > 0 ? [...hydrated, ...localDrafts] : localDrafts;
          const ensuredSessions = nextSessions.length > 0 ? nextSessions : [buildSession()];
          const activeSessionId = ensuredSessions.some((session) => session.id === state.activeSessionId)
            ? state.activeSessionId
            : ensuredSessions[0].id;

          return {
            sessions: ensuredSessions,
            activeSessionId,
            isInitialised: true,
          };
        });
      },

      syncSessionDetail: (detail) => {
        set((state) => {
          const existing = state.sessions.find((session) => session.id === detail.session.id);
          const mapped = mapSummaryToSession(detail.session, existing);
          mapped.messages = mapDetailToMessages(detail);

          const others = state.sessions.filter((session) => session.id !== mapped.id);
          return {
            sessions: [mapped, ...others],
            activeSessionId: mapped.id,
          };
        });
      },

      switchSession: (id) => {
        set({ activeSessionId: id, error: null });
      },

      deleteSessionLocal: (id) => {
        set((state) => {
          const remaining = state.sessions.filter((session) => session.id !== id);
          const nextSessions = remaining.length > 0 ? remaining : [buildSession()];
          const nextActiveSessionId =
            state.activeSessionId === id ? nextSessions[0].id : state.activeSessionId ?? nextSessions[0].id;

          return {
            sessions: nextSessions,
            activeSessionId: nextActiveSessionId,
          };
        });
      },

      addMessage: (message) => {
        const { activeSessionId } = get();
        if (!activeSessionId) {
          return null;
        }

        const newMessage: Message = {
          id: uuidv4(),
          timestamp: new Date(),
          ...message,
        };

        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== activeSessionId) {
              return session;
            }

            const nextMessages = [...session.messages, newMessage];
            const nextTitle =
              session.title === 'New conversation' && message.role === 'user'
                ? message.content.slice(0, 48).trim() || 'New conversation'
                : session.title;

            return {
              ...session,
              messages: nextMessages,
              updatedAt: new Date(),
              title: nextTitle,
              messageCount: nextMessages.length,
            };
          }),
        }));

        return newMessage.id;
      },

      updateMessage: (id, patch) => {
        const { activeSessionId } = get();
        if (!activeSessionId) {
          return;
        }

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  updatedAt: new Date(),
                  messages: session.messages.map((message) =>
                    message.id === id ? { ...message, ...patch } : message
                  ),
                }
              : session
          ),
        }));
      },

      setUserContext: (context) => {
        const { activeSessionId } = get();
        if (!activeSessionId) {
          return;
        }

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId
              ? { ...session, userContext: context, updatedAt: new Date() }
              : session
          ),
        }));
      },

      setStageContext: (stageContext) => {
        const { activeSessionId } = get();
        if (!activeSessionId) {
          return;
        }

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId
              ? { ...session, stageContext, updatedAt: new Date() }
              : session
          ),
        }));
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      clearAllSessions: () => {
        const session = buildSession();
        set({
          ...initialState,
          sessions: [session],
          activeSessionId: session.id,
          isInitialised: true,
        });
      },
    }),
    {
      name: 'civicmind-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);

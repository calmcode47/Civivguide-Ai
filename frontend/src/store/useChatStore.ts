import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { ChatSession, Message } from '@/types';

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
  createNewSession: (userContext?: string) => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  setUserContext: (context: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearAllSessions: () => void;
}

const buildSession = (userContext = 'First-Time Voter'): ChatSession => ({
  id: `session_${uuidv4()}`,
  messages: [],
  userContext,
  createdAt: new Date(),
  updatedAt: new Date(),
  title: 'New conversation',
});

const initialState: ChatState = {
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  isInitialised: false,
  error: null,
};

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
        if (isInitialised) return;

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

      createNewSession: (userContext) => {
        const session = buildSession(userContext);
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
          error: null,
        }));
        return session.id;
      },

      switchSession: (id) => {
        set({ activeSessionId: id, error: null });
      },

      deleteSession: (id) => {
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
        if (!activeSessionId) return;

        const newMessage: Message = {
          id: uuidv4(),
          timestamp: new Date(),
          ...message,
        };

        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== activeSessionId) return session;

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
            };
          }),
        }));
      },

      updateMessage: (id, patch) => {
        const { activeSessionId } = get();
        if (!activeSessionId) return;

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
        if (!activeSessionId) return;

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId
              ? { ...session, userContext: context, updatedAt: new Date() }
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

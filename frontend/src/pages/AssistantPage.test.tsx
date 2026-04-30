import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AssistantPage from '@/pages/AssistantPage';
import { useChatStore } from '@/store/useChatStore';

const {
  apiClientMock,
  streamChatResponseMock,
  trackEventMock,
  useApiHealthMock,
  useSuggestionsMock,
  useNetworkStatusMock,
} = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  streamChatResponseMock: vi.fn(),
  trackEventMock: vi.fn().mockResolvedValue(undefined),
  useApiHealthMock: vi.fn(),
  useSuggestionsMock: vi.fn(),
  useNetworkStatusMock: vi.fn(),
}));

vi.mock('@/lib/apiClient', () => ({
  default: apiClientMock,
}));

vi.mock('@/lib/chatStream', () => ({
  streamChatResponse: streamChatResponseMock,
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: trackEventMock,
}));

vi.mock('@/hooks/useApiHealth', () => ({
  useApiHealth: useApiHealthMock,
}));

vi.mock('@/hooks/useSuggestions', () => ({
  useSuggestions: useSuggestionsMock,
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: useNetworkStatusMock,
}));

function renderAssistantPage(initialPath = '/assistant') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/assistant" element={<AssistantPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('AssistantPage', () => {
  beforeEach(() => {
    useChatStore.persist.clearStorage();
    useChatStore.setState({
      sessions: [],
      activeSessionId: null,
      isLoading: false,
      isInitialised: false,
      error: null,
    });

    apiClientMock.get.mockReset();
    apiClientMock.post.mockReset();
    apiClientMock.delete.mockReset();
    streamChatResponseMock.mockReset();
    trackEventMock.mockClear();

    useApiHealthMock.mockReturnValue({
      isReachable: true,
      geminiReady: true,
      translateReady: true,
      firestoreMode: 'firestore',
      isChecking: false,
    });
    useSuggestionsMock.mockReturnValue({
      suggestions: ['How do I check my polling booth?'],
      isLoading: false,
    });
    useNetworkStatusMock.mockReturnValue({ isOnline: true });
  });

  it('hydrates backend sessions and deletes them remotely', async () => {
    const sessionSummary = {
      id: 'remote-1',
      title: 'Registration help',
      user_context: 'First-Time Voter',
      stage_context: 'Registration & Roll Check',
      language: 'en',
      message_count: 2,
      updated_at: '2026-04-30T10:00:00Z',
    };

    apiClientMock.get.mockImplementation((url: string) => {
      if (url === '/api/sessions') {
        return Promise.resolve({
          data: { data: { sessions: [sessionSummary] } },
        });
      }

      if (url === '/api/sessions/remote-1') {
        return Promise.resolve({
          data: {
            data: {
              session: sessionSummary,
              messages: [
                {
                  id: 'user-1',
                  role: 'user',
                  content: 'How do I register?',
                  language: 'en',
                  timestamp: '2026-04-30T10:00:00Z',
                },
                {
                  id: 'assistant-1',
                  role: 'assistant',
                  content: 'Use Form 6 on the Voters portal.',
                  language: 'en',
                  timestamp: '2026-04-30T10:01:00Z',
                },
              ],
            },
          },
        });
      }

      return Promise.reject(new Error('not found'));
    });
    apiClientMock.delete.mockResolvedValue({
      data: { data: { deleted: true, session_id: 'remote-1' } },
    });

    renderAssistantPage();

    expect(await screen.findByText('Registration help')).toBeInTheDocument();
    expect(screen.getByText('Sessions loaded from Firestore.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Registration help' }));
    expect(await screen.findByText('Use Form 6 on the Voters portal.')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /delete conversation registration help/i })
    );

    await waitFor(() => {
      expect(apiClientMock.delete).toHaveBeenCalledWith('/api/sessions/remote-1');
    });
    expect(trackEventMock).toHaveBeenCalledWith(
      'session_deleted',
      expect.objectContaining({ used_remote_delete: true })
    );
  });

  it('sends stage-aware streaming requests and renders incremental replies', async () => {
    apiClientMock.get.mockImplementation((url: string) => {
      if (url === '/api/sessions') {
        return Promise.resolve({
          data: { data: { sessions: [] } },
        });
      }
      return Promise.reject(new Error('session not found'));
    });

    streamChatResponseMock.mockImplementation(
      async (
        payload: {
          stage_context: string;
          user_context: string;
          session_id: string | null;
        },
        onEvent: (event: Record<string, unknown>) => void
      ) => {
        onEvent({
          type: 'meta',
          session_id: payload.session_id,
          intent: 'polling',
          suggestions: ['What ID should I carry?'],
          sources: [],
          stage_context: payload.stage_context,
          persona: payload.user_context.toLowerCase(),
        });
        onEvent({ type: 'chunk', content: 'Check your booth first. ' });
        onEvent({
          type: 'done',
          reply: 'Check your booth first. Carry one valid identity document.',
          intent: 'polling',
          suggestions: ['What ID should I carry?'],
          sources: [],
          stage_context: payload.stage_context,
          persona: payload.user_context.toLowerCase(),
        });
      }
    );

    renderAssistantPage();

    await userEvent.click(screen.getByRole('button', { name: 'Candidate' }));
    await userEvent.click(screen.getByRole('button', { name: 'Polling Day' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: /ask civicmind a question/i }),
      'What should I verify before polling starts?'
    );
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText('Check your booth first. Carry one valid identity document.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'What ID should I carry?' })).toBeInTheDocument();

    expect(streamChatResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage_context: 'Polling Day',
        user_context: 'Candidate',
      }),
      expect.any(Function),
      expect.any(AbortSignal)
    );
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChatBubble from '@/components/ui/ChatBubble';

const { apiClientMock, trackEventMock } = vi.hoisted(() => ({
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  trackEventMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/apiClient', () => ({
  default: apiClientMock,
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: trackEventMock,
}));

describe('ChatBubble', () => {
  beforeEach(() => {
    apiClientMock.post.mockReset();
    trackEventMock.mockClear();
  });

  it('translates assistant answers and submits feedback', async () => {
    apiClientMock.post
      .mockResolvedValueOnce({
        data: {
          data: {
            translated_text: 'Hindi translation',
            detected_source: 'en',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            saved: true,
          },
        },
      });

    render(
      <ChatBubble
        sessionId="session-1"
        translateEnabled
        message={{
          id: 'assistant-1',
          role: 'assistant',
          content: 'Carry a valid voter identity document.',
          timestamp: new Date('2026-04-30T10:30:00Z'),
        }}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Translate' }));

    expect(await screen.findByText('Hindi translation')).toBeInTheDocument();
    expect(trackEventMock).toHaveBeenCalledWith(
      'translation_requested',
      expect.objectContaining({ target_language: 'hi' })
    );

    await userEvent.click(screen.getByRole('button', { name: /submit positive feedback/i }));
    await userEvent.type(
      screen.getByRole('textbox', { name: /optional feedback note/i }),
      'This answer is concise and useful.'
    );
    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    expect(await screen.findByText('Feedback saved')).toBeInTheDocument();
    expect(apiClientMock.post).toHaveBeenNthCalledWith(
      2,
      '/api/feedback',
      expect.objectContaining({
        session_id: 'session-1',
        rating: 5,
        comment: 'This answer is concise and useful.',
      })
    );
    expect(trackEventMock).toHaveBeenCalledWith(
      'feedback_submitted',
      expect.objectContaining({ rating: 5 })
    );
  });

  it('shows partial assistant content while streaming', () => {
    render(
      <ChatBubble
        message={{
          id: 'assistant-streaming',
          role: 'assistant',
          content: 'Carry your EPIC and one valid photo ID.',
          timestamp: new Date('2026-04-30T10:35:00Z'),
          isStreaming: true,
        }}
      />
    );

    expect(screen.getByText(/carry your epic and one valid photo id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/civicmind is typing/i)).toBeInTheDocument();
  });
});

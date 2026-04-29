import { useCallback } from 'react';
import apiClient from '../lib/apiClient';
import { useChatStore } from '../store/useChatStore';
import type { ApiResponse, ChatReplyPayload } from '@/types';

export function useChat() {
  const { getActiveSession, addMessage, setLoading, setError, isLoading, updateMessage } = useChatStore();

  const sendMessage = useCallback(async (content: string, isRetry = false) => {
    if (!content.trim() || isLoading) return;

    if (!isRetry) {
      addMessage({
        role: 'user',
        content: content.trim(),
      });
    }

    setLoading(true);
    setError(null);

    const placeholder = {
      role: 'assistant' as const,
      content: '',
      isStreaming: true,
      error: undefined,
    };

    if (isRetry) {
      const currentSession = getActiveSession();
      const lastMessage = currentSession?.messages[currentSession.messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        updateMessage(lastMessage.id, placeholder);
      } else {
        addMessage(placeholder);
      }
    } else {
      addMessage(placeholder);
    }

    try {
      const activeSession = getActiveSession();
      const response = await apiClient.post<ApiResponse<ChatReplyPayload>>('/api/chat', {
        message: content.trim(),
        session_id: activeSession?.id,
        user_context: activeSession?.userContext ?? 'First-Time Voter',
        language: 'en',
      });

      const payload = response.data.data;
      const updatedSession = getActiveSession();
      const lastMessage = updatedSession?.messages[updatedSession.messages.length - 1];

      if (lastMessage?.role === 'assistant') {
        updateMessage(lastMessage.id, {
          content: payload.reply,
          isStreaming: false,
          suggestions: payload.suggestions ?? [],
          error: undefined,
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to get a response. Please try again.';
      const updatedSession = getActiveSession();
      const lastMessage = updatedSession?.messages[updatedSession.messages.length - 1];

      if (lastMessage?.role === 'assistant') {
        updateMessage(lastMessage.id, {
          content: 'I could not complete that request right now.',
          isStreaming: false,
          error: message,
        });
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [addMessage, getActiveSession, isLoading, setError, setLoading, updateMessage]);

  return { sendMessage, isLoading };
}

import { useCallback } from 'react';

import { trackEvent } from '@/lib/analytics';
import { streamChatResponse } from '@/lib/chatStream';
import type { ChatStreamChunkEvent, ChatStreamDoneEvent, ChatStreamMetaEvent } from '@/types';

import { useChatStore } from '../store/useChatStore';

export function useChat() {
  const {
    getActiveSession,
    addMessage,
    setLoading,
    setError,
    isLoading,
    updateMessage,
  } = useChatStore();

  const sendMessage = useCallback(
    async (content: string, isRetry = false) => {
      if (!content.trim() || isLoading) {
        return;
      }

      const activeSession = getActiveSession();
      if (!activeSession) {
        return;
      }

      if (!isRetry) {
        addMessage({
          role: 'user',
          content: content.trim(),
        });
      }

      setLoading(true);
      setError(null);

      let assistantMessageId: string | null = null;
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
          assistantMessageId = lastMessage.id;
          updateMessage(lastMessage.id, placeholder);
        }
      }

      if (!assistantMessageId) {
        assistantMessageId = addMessage(placeholder);
      }

      let streamedContent = '';
      let streamCompleted = false;
      const abortController = new AbortController();
      let idleTimeoutId: number | null = null;

      const clearIdleTimeout = () => {
        if (idleTimeoutId !== null) {
          window.clearTimeout(idleTimeoutId);
          idleTimeoutId = null;
        }
      };

      const scheduleIdleTimeout = () => {
        clearIdleTimeout();
        idleTimeoutId = window.setTimeout(() => {
          abortController.abort(new DOMException('Stream timed out', 'AbortError'));
        }, 12000);
      };

      try {
        await trackEvent('assistant_query_sent', {
          stage_context: activeSession.stageContext,
          user_context: activeSession.userContext,
          retry: isRetry,
        });

        scheduleIdleTimeout();

        await streamChatResponse(
          {
            message: content.trim(),
            session_id: activeSession.id,
            user_context: activeSession.userContext,
            stage_context: activeSession.stageContext,
            language: 'en',
          },
          async (event) => {
            if (!assistantMessageId) {
              return;
            }

            scheduleIdleTimeout();

            if (event.type === 'meta') {
              const metaEvent = event as ChatStreamMetaEvent;
              updateMessage(assistantMessageId, {
                suggestions: metaEvent.suggestions,
              });
              await trackEvent('assistant_reply_stream_started', {
                intent: metaEvent.intent,
                stage_context: metaEvent.stage_context,
                user_context: activeSession.userContext,
              });
              return;
            }

            if (event.type === 'chunk') {
              const chunkEvent = event as ChatStreamChunkEvent;
              streamedContent = `${streamedContent}${chunkEvent.content}`;
              updateMessage(assistantMessageId, {
                content: streamedContent,
                isStreaming: true,
              });
              return;
            }

            const doneEvent = event as ChatStreamDoneEvent;
            streamCompleted = true;
            clearIdleTimeout();
            updateMessage(assistantMessageId, {
              content: doneEvent.reply,
              isStreaming: false,
              suggestions: doneEvent.suggestions ?? [],
              error: undefined,
            });
            await trackEvent('assistant_reply_completed', {
              intent: doneEvent.intent,
              stage_context: doneEvent.stage_context,
              user_context: activeSession.userContext,
            });
          },
          abortController.signal
        );
      } catch (error: unknown) {
        const isAbortError =
          error instanceof DOMException
            ? error.name === 'AbortError'
            : error instanceof Error && error.name === 'AbortError';
        const message =
          error instanceof Error ? error.message : 'Failed to get a response. Please try again.';
        if (assistantMessageId) {
          if (streamedContent.trim().length > 0) {
            updateMessage(assistantMessageId, {
              content: streamedContent.trim(),
              isStreaming: false,
              error: isAbortError ? undefined : message,
            });
          } else {
            updateMessage(assistantMessageId, {
              content: 'I could not complete that request right now.',
              isStreaming: false,
              error: message,
            });
          }
        }

        if (!(isAbortError && streamedContent.trim().length > 0)) {
          setError(message);
        }
      } finally {
        clearIdleTimeout();
        if (assistantMessageId && !streamCompleted && streamedContent.trim().length > 0) {
          updateMessage(assistantMessageId, {
            content: streamedContent.trim(),
            isStreaming: false,
            error: undefined,
          });
        }
        setLoading(false);
      }
    },
    [addMessage, getActiveSession, isLoading, setError, setLoading, updateMessage]
  );

  return { sendMessage, isLoading };
}

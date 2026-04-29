import apiClient from '../lib/apiClient';
import { useChatStore } from '../store/useChatStore';

/**
 * useChat
 * Custom hook to handle sending messages to the CivicGuide AI backend.
 * Manages optimistic updates, loading states, and error handling.
 */
export function useChat() {
  const { getActiveSession, addMessage, setLoading, setError, isLoading, updateMessage } = useChatStore();

  const sendMessage = async (content: string, isRetry = false) => {
    if (!content.trim() || isLoading) return;


    // 1. Add user message optimistically (only if not retrying)
    if (!isRetry) {
      addMessage({
        role: 'user',
        content: content.trim()
      });
    }

    setLoading(true);
    setError(null);

    // 2. Add or Reset streaming placeholder for assistant
    const placeholder: any = {
      role: 'assistant',
      content: '',
      isStreaming: true,
      error: undefined
    };

    if (isRetry) {
      // Find the last assistant message (which should be the error one) and reset it
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
      // 3. Call backend API
      const currentSessionAfterUpdate = getActiveSession();
      
      const response = await apiClient.post('/api/chat', {
        message: content.trim(),
        session_id: currentSessionAfterUpdate?.id,
        user_context: currentSessionAfterUpdate?.userContext || 'general'
      });
      
      const { reply, suggestions } = response.data.data;

      // 4. Update the assistant message with real content
      const sessionAfterApi = getActiveSession();
      if (sessionAfterApi && sessionAfterApi.messages.length > 0) {
        const lastMessage = sessionAfterApi.messages[sessionAfterApi.messages.length - 1];
        if (lastMessage.role === 'assistant') {
          updateMessage(lastMessage.id, {
            content: reply,
            isStreaming: false,
            suggestions: suggestions || [],
            error: undefined
          });
        }
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Failed to get response. Please try again.';
      const isRateLimit = err?.response?.status === 429;
      
      const sessionAfterError = getActiveSession();
      if (sessionAfterError && sessionAfterError.messages.length > 0) {
        const lastMessage = sessionAfterError.messages[sessionAfterError.messages.length - 1];
        if (lastMessage.role === 'assistant') {
          updateMessage(lastMessage.id, {
            content: isRateLimit 
              ? "I'm receiving too many requests right now. Please wait a moment and try again." 
              : "I encountered an error while processing your request.",
            isStreaming: false,
            error: errorMsg
          });
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, isLoading };
}

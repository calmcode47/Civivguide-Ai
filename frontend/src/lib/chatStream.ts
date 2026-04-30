import type { ChatStreamEvent, StageContext } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface StreamChatPayload {
  message: string;
  session_id: string | null;
  user_context: string;
  stage_context: StageContext;
  language: 'en';
}

async function buildError(response: Response): Promise<Error> {
  try {
    const payload = await response.json();
    const message =
      payload?.error || payload?.detail || 'Unable to stream the assistant response right now.';
    return new Error(message);
  } catch {
    return new Error('Unable to stream the assistant response right now.');
  }
}

export async function streamChatResponse(
  payload: StreamChatPayload,
  onEvent: (event: ChatStreamEvent) => void | Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.0',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    throw await buildError(response);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame
        .split('\n')
        .find((candidate) => candidate.startsWith('data: '));
      if (!line) {
        continue;
      }

      const json = line.slice(6).trim();
      if (!json) {
        continue;
      }

      await onEvent(JSON.parse(json) as ChatStreamEvent);
    }
  }

  if (buffer.trim().startsWith('data: ')) {
    await onEvent(JSON.parse(buffer.trim().slice(6)) as ChatStreamEvent);
  }
}

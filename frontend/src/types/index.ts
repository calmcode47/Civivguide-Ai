export interface OfficialResource {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  isStreaming?: boolean;
  suggestions?: string[];
  error?: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  userContext: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  title?: string;
}

export interface ElectionStep {
  id: string;
  phase: string;
  title: string;
  description: string;
  duration: string;
  order: number;
  details: string[];
}

export interface ElectionPhase {
  id: string;
  name: string;
  color: string;
  steps: ElectionStep[];
}

export interface ElectionTimelineResponse {
  phases: ElectionPhase[];
  total_steps: number;
  sources?: OfficialResource[];
}

export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  error?: string | null;
}

export interface ChatReplyPayload {
  session_id: string;
  reply: string;
  intent: string;
  suggestions: string[];
  sources: OfficialResource[];
}

export interface SuggestionsPayload {
  persona: string;
  language: 'en' | 'hi';
  suggestions: string[];
}

export interface BackendHealthPayload {
  service: string;
  version: string;
  environment: string;
  backend_ready: boolean;
  gemini_ready: boolean;
  firestore_mode: 'firestore' | 'memory';
  rate_limit_per_minute: number;
}

export interface NavLink {
  label: string;
  href: string;
}

import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import type { ApiResponse, SuggestionsPayload } from '@/types';

export function useSuggestions(persona: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<ApiResponse<SuggestionsPayload>>('/api/suggestions', {
        params: { persona, language: 'en' },
      })
      .then((response) => {
        setSuggestions(response.data.data.suggestions ?? []);
      })
      .catch(() => {
        setSuggestions([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [persona]);

  return { suggestions, isLoading };
}

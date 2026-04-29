import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import type { ApiResponse, BackendHealthPayload } from '@/types';

interface BackendHealth {
  isReachable: boolean;
  geminiReady: boolean;
  firestoreMode: 'firestore' | 'memory';
  isChecking: boolean;
}

export function useApiHealth(): BackendHealth {
  const [state, setState] = useState<BackendHealth>({
    isReachable: true,
    geminiReady: false,
    firestoreMode: 'memory',
    isChecking: true,
  });

  useEffect(() => {
    apiClient
      .get<ApiResponse<BackendHealthPayload>>('/api/health')
      .then((response) => {
        setState({
          isReachable: response.data.data.backend_ready,
          geminiReady: response.data.data.gemini_ready,
          firestoreMode: response.data.data.firestore_mode,
          isChecking: false,
        });
      })
      .catch(() => {
        setState({
          isReachable: false,
          geminiReady: false,
          firestoreMode: 'memory',
          isChecking: false,
        });
      });
  }, []);

  return state;
}

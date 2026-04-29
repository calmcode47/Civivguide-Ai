import axios from 'axios';
// Removed package.json import to avoid Vite resolution issues
const CLIENT_VERSION = '1.0.0';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * apiClient
 * Standardized Axios instance for all CivicMind backend communication.
 * Includes timeout protection and unified error mapping.
 */
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 90000, // 90 seconds to allow for long AI generations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add version metadata
apiClient.interceptors.request.use((config) => {
  config.headers['X-Client-Version'] = CLIENT_VERSION;
  return config;
});

// Response Interceptor: Unified Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'An unexpected error occurred.';

    if (error.response) {
      // Server responded with non-2xx status
      const status = error.response.status;
      if (status >= 400 && status < 500) {
        errorMessage =
          error.response.data?.error ||
          error.response.data?.detail ||
          'Invalid request. Please try again.';
      } else {
        errorMessage = 'Server error. Please try again.';
      }
    } else if (error.request) {
      // Request made but no response (Network error)
      errorMessage = 'Network error. Check your connection.';
    }

    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach X-Super-Admin-Key from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const key = localStorage.getItem('admin_key');
  if (key) {
    config.headers['X-Super-Admin-Key'] = key;
  }
  return config;
});

// Unwrap the ApiResponseInterceptor envelope `{ code, status, message, data, metadata }`
// so every API function receives the raw payload directly.
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body !== null && typeof body === 'object' && 'data' in body && 'message' in body) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_key');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

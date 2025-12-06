import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - no need to add Authorization header since we use HTTP-only cookies
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-redirect on 401 - let the ProtectedRoute component handle it
    // This prevents race conditions and allows proper auth state management
    console.log('API Error:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

export default api;

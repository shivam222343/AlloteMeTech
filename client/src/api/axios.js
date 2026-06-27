import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://allotemetech.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response handler to auto logout on session conflicts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response.data?.message;
      if (msg && msg.includes('another device')) {
        localStorage.removeItem('token');
        window.location.href = '/login?error=another_device';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

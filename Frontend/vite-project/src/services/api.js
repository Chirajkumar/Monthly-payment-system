import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const apiBaseUrl = import.meta.env.PROD
  ? configuredApiUrl && configuredApiUrl !== '/api'
    ? configuredApiUrl
    : 'https://monthly-payment-system.onrender.com/api'
  : configuredApiUrl || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url?.startsWith('/admin')) {
      localStorage.removeItem('token');
      localStorage.removeItem('demoUser');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    return Promise.reject(error);
  }
);

export default api;

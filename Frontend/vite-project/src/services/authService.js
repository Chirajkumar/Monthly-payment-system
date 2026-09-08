import api from './api';

export const loginMember = (name, dateOfBirth) =>
  api.post('/auth/login', { name, dateOfBirth });

export const loginAdmin = (email, password) =>
  api.post('/auth/admin/login', { email, password });

export const getCurrentUser = () => api.get('/auth/me');

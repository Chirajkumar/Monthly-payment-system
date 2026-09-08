import api from './api';

export const getCurrentMonthPayment = () => api.get('/payments/current');
export const getPaymentHistory = (page = 1, limit = 10) =>
  api.get('/payments/history', { params: { page, limit } });
export const getPaymentSummary = () => api.get('/payments/summary');
export const submitPayment = (data) => api.post('/payments/submit', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

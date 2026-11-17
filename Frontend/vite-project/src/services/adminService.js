import api from './api';

export const getMembers = (params = {}) => api.get('/admin/members', { params });
export const addMember = (payload) => api.post('/admin/members', payload);
export const updateMember = (id, payload) => api.put(`/admin/members/${id}`, payload);
export const deleteMember = (id) => api.delete(`/admin/members/${id}`);
export const deletePayment = (paymentId) => api.delete(`/admin/payments/${paymentId}`);
export const getMonthlyStatus = (params = {}) => api.get('/admin/monthly-status', { params });
export const verifyPayment = (paymentId, data) => api.put(`/admin/verify-payment/${paymentId}`, data);
export const getStatistics = () => api.get('/admin/statistics');

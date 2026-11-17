import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentMonthPayment, getPaymentSummary, getPaymentHistory } from '../services/paymentService';

const buildDemoPayment = () => ({
  _id: 'demo-payment',
  month: new Date().toLocaleString('default', { month: 'long' }),
  year: new Date().getFullYear(),
  amount: 200,
  status: 'pending',
  transactionId: '',
  paymentProof: '',
});

const buildDemoSummary = () => ({
  totalPaid: 0,
  totalPending: 1,
  currentMonthStatus: 'pending',
  monthsPaid: 0,
});

export const PaymentContext = createContext();

export const usePayments = () => useContext(PaymentContext);

export const PaymentProvider = ({ children }) => {
  const [currentPayment, setCurrentPayment] = useState(buildDemoPayment());
  const [paymentSummary, setPaymentSummary] = useState(buildDemoSummary());
  const [paymentHistory, setPaymentHistory] = useState([
    { _id: 'demo-h1', month: 'July', year: 2026, status: 'verified', transactionId: 'TRANS-001' },
  ]);
  const [loading, setLoading] = useState(false);

  const fetchCurrentPayment = useCallback(async () => {
    try {
      const { data } = await getCurrentMonthPayment();
      setCurrentPayment(data.payment);
    } catch {
      setCurrentPayment(buildDemoPayment());
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await getPaymentSummary();
      console.log('📊 PAYMENT SUMMARY:', {
        totalPaid: data.summary.totalPaid,
        monthsPaid: data.summary.monthsPaid,
        totalPending: data.summary.totalPending,
        currentStatus: data.summary.currentMonthStatus
      });
      setPaymentSummary(data.summary);
    } catch (error) {
      console.error('❌ Error fetching summary:', error);
      setPaymentSummary(buildDemoSummary());
    }
  }, []);

  const fetchHistory = useCallback(async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const { data } = await getPaymentHistory(page, limit);
      setPaymentHistory(data.payments || []);
    } catch {
      setPaymentHistory([
        { _id: 'demo-h1', month: 'September', year: new Date().getFullYear(), status: 'pending', transactionId: '' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertPayment = useCallback((payment) => {
    if (!payment?._id) {
      return;
    }

    setPaymentHistory((currentHistory) => [
      payment,
      ...currentHistory.filter((item) => item._id !== payment._id)
    ]);
  }, []);

  useEffect(() => {
    fetchCurrentPayment();
    fetchSummary();
    fetchHistory();
  }, [fetchCurrentPayment, fetchSummary, fetchHistory]);

  const value = {
    currentPayment,
    paymentSummary,
    paymentHistory,
    loading,
    fetchCurrentPayment,
    fetchSummary,
    fetchHistory,
    upsertPayment,
    setCurrentPayment,
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
};

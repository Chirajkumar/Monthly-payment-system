import { useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiDownload, FiDollarSign, FiUpload } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { usePayments } from '../../context/PaymentContext';
import { submitPayment } from '../../services/paymentService';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import Loading from '../common/Loading';
import uploadedQrCode from '../../assets/qrcode.jpeg';

const Dashboard = () => {
  const { user } = useAuth();
  const { currentPayment, paymentSummary, paymentHistory, fetchCurrentPayment, fetchSummary, fetchHistory, upsertPayment } = usePayments();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    month: currentMonth,
    year: currentYear,
    paymentDate: today,
    paymentMethod: 'cash',
    paidTo: '',
    payerName: '',
    transactionId: '',
    proof: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCurrentPayment();
    fetchSummary();
    fetchHistory();
  }, [fetchCurrentPayment, fetchSummary, fetchHistory]);

  const isCashPayment = form.paymentMethod === 'cash';
  const filteredPaymentHistory = paymentHistory || [];

  const getMonthYearFromDate = (value) => {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return { month: currentMonth, year: currentYear };
    }
    const [year, monthNumber] = parts;
    return {
      month: new Date(year, monthNumber - 1, 1).toLocaleString('default', { month: 'long' }),
      year
    };
  };

  const getStatusLabel = (status) => {
    if (status === 'paid' || status === 'verified') return 'Paid';
    if (status === 'rejected' || status === 'cancelled') return 'Rejected';
    if (status === 'pending') return 'Pending';
    return status || 'Pending';
  };

  const getStatusClass = (status) => {
    if (status === 'paid' || status === 'verified') return 'paid';
    if (status === 'rejected' || status === 'cancelled') return 'rejected';
    return 'pending';
  };

  const formatPaymentDate = (payment) => {
    const date = payment?.paymentDate || payment?.createdAt;
    if (!date) return 'Date unavailable';

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime())
      ? 'Date unavailable'
      : parsedDate.toLocaleDateString();
  };

  const currentStatusText = getStatusLabel(currentPayment?.status);

  const handleDownloadHistory = () => {
    if (!filteredPaymentHistory.length) {
      return;
    }

    const rows = [
      ['Member Name', 'Month', 'Year', 'Payment Date', 'Status', 'Transaction ID'],
      ...filteredPaymentHistory.map((item) => [
        user?.name || '',
        item.month || '',
        item.year || '',
        formatPaymentDate(item),
        getStatusLabel(item.status),
        item.transactionId || ''
      ])
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payment-history.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const paymentAmount = currentPayment?.amount || 200;
  const upiParams = new URLSearchParams({
    pa: 'chirajkenjila@oksbi',
    pn: 'Chiraj Kenjila',
    am: String(paymentAmount),
    cu: 'INR',
    tn: 'Kenjila Monthly Payment'
  });
  const upiLink = `upi://pay?${upiParams.toString()}`;
  const googlePayLink = `intent://pay?${upiParams.toString()}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;

  const handleOpenGooglePay = (event) => {
    event.preventDefault();
    const clearFallback = () => {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearFallback();
      }
    };
    const fallbackTimer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.href = upiLink;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, 1200);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.location.assign(googlePayLink);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.paymentDate) {
      setMessage('Please select the payment date.');
      return;
    }

    if (!form.paidTo.trim()) {
      setMessage('Please enter who you paid or gave the money to.');
      return;
    }

    if (form.paymentMethod === 'online' && !form.proof) {
      setMessage('Please upload a payment proof for online payment.');
      return;
    }

    if (form.paymentMethod === 'online' && form.proof && form.proof.size > 5 * 1024 * 1024) {
      setMessage('Payment proof image is too large. Max size is 5MB.');
      return;
    }

    if (form.paymentMethod === 'online' && form.proof && !/image\/(png|jpe?g|gif|webp)/i.test(form.proof.type)) {
      setMessage('Payment proof must be an image (PNG, JPG, GIF, or WEBP).');
      return;
    }

    const data = new FormData();
    const { month: submitMonth, year: submitYear } = getMonthYearFromDate(form.paymentDate);
    data.append('month', submitMonth);
    data.append('year', String(submitYear));
    data.append('paymentDate', form.paymentDate);
    data.append('paymentMethod', form.paymentMethod);
    data.append('paidTo', form.paidTo);
    data.append('payerName', user.name);
    if (form.proof) data.append('paymentProof', form.proof);

    setSubmitting(true);
    try {
      const { data: response } = await submitPayment(data);
      console.log('PAYMENT SUBMITTED:', response.payment);
      upsertPayment(response.payment);
      setMessage(response.message || 'Payment submitted successfully');
      console.log('Refreshing payment data...');
      await Promise.all([fetchCurrentPayment(), fetchSummary(), fetchHistory()]);
      console.log('Payment data refreshed');
      setForm((prev) => ({
        ...prev,
        month: currentMonth,
        year: currentYear,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        paidTo: '',
        payerName: '',
        transactionId: '',
        proof: null
      }));
    } catch (error) {
      console.error('SUBMISSION ERROR:', error);
      if (!error.response) {
        setMessage('Cannot reach the server. Make sure the backend is running and you are logged in (not demo mode).');
      } else {
        setMessage(error.response.data?.message || 'Payment could not be submitted');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return <Loading text="Loading dashboard..." />;
  }

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>{user.name}</h2>
            <p className="muted">Member ID: {user.memberId || 'N/A'}</p>
          </div>
          <div className="hero-stats">
            <div className="metric-card success">
              <FiCheckCircle />
              <div>
                <strong>{paymentSummary?.monthsPaid || 0}</strong>
                <span>Months paid</span>
              </div>
            </div>
            <div className="metric-card warning">
              <FiClock />
              <div>
                <strong>{paymentSummary?.totalPending || 0}</strong>
                <span>Pending</span>
              </div>
            </div>
          </div>

        </section>

        <section className="stats-grid">
          <div className="stat-box">
            <FiDollarSign />
            <div>
              <small>Total paid</small>
              <strong>Rs {paymentSummary?.monthsPaid ? paymentSummary.monthsPaid * 200 : 0}</strong>
            </div>
          </div>
          <div className="stat-box">
            <FiUpload />
            <div>
              <small>Current status</small>
              <strong>{currentStatusText}</strong>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel payment-panel" id="payments">
            <div className="panel-header">
              <h3>Submit payment</h3>
              <span className="chip">Rs {currentPayment?.amount || 200}</span>
            </div>

            <form onSubmit={handleSubmit} className="payment-form">
              <label>
                <span>Select Date (Month & Year)</span>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => {
                    const { month, year } = getMonthYearFromDate(e.target.value);
                    setForm({ ...form, paymentDate: e.target.value, month, year });
                  }}
                />
              </label>

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Payment method</span>
                <div className="payment-method-group">
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={form.paymentMethod === 'cash'}
                      onChange={() => setForm({ ...form, paymentMethod: 'cash' })}
                    />
                    <span>Cash</span>
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={form.paymentMethod === 'online'}
                      onChange={() => setForm({ ...form, paymentMethod: 'online' })}
                    />
                    <span>Online</span>
                  </label>
                </div>
              </div>

              {isCashPayment ? (
                <label>
                  <span>Who did you give the money to?</span>
                  <input
                    value={form.paidTo}
                    onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                    placeholder="Enter the name"
                  />
                </label>
              ) : (
                <>
                  <div className="qr-section">
                    <div className="qr-section-header">
                      <strong>Scan QR code</strong>
                      <a href={googlePayLink} onClick={handleOpenGooglePay} className="upi-launch-link">
                        Open Google Pay
                      </a>
                    </div>
                    <a href={googlePayLink} onClick={handleOpenGooglePay} className="qr-link" aria-label="Open Google Pay to pay">
                      <img src={uploadedQrCode} alt="UPI QR code for Kenjila membership payment" />
                    </a>
                    <p className="qr-help">Tap the QR code to pay with Google Pay</p>
                  </div>

                  <label>
                    <span>Who did you pay?</span>
                    <input
                      value={form.paidTo}
                      onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                      placeholder="e.g. Management office"
                    />
                  </label>
                </>
              )}

              {!isCashPayment && (
                <label>
                  <span>Payment proof</span>
                  <input
                    type="file"
                    accept="image/*"
                    required={form.paymentMethod === 'online'}
                    onChange={(e) => setForm({ ...form, proof: e.target.files[0] })}
                  />
                </label>
              )}

              {message && <div className="notice-box">{message}</div>}

              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit payment'}
              </button>
            </form>
          </div>

          <div className="panel payment-history-panel">
            <div className="panel-header">
              <h3>Payment history</h3>
              <button
                type="button"
                onClick={handleDownloadHistory}
                aria-label="Download payment history"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: filteredPaymentHistory.length ? 'pointer' : 'not-allowed',
                  opacity: filteredPaymentHistory.length ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
                disabled={!filteredPaymentHistory.length}
              >
                <FiDownload />
              </button>
            </div>

            <div className="history-list">
              {filteredPaymentHistory.length === 0 ? (
                <p className="empty-state">No payment records yet.</p>
              ) : (
                filteredPaymentHistory.map((item) => (
                  <div className="history-item" key={item._id || `${item.month}-${item.year}`}>
                    <div>
                      <strong>{user?.name || 'Member'}</strong>
                      <small>{item.month} {item.year} · Payment date: {formatPaymentDate(item)}</small>
                      <small>{item.transactionId || 'No transaction ID'}</small>
                    </div>
                    <span className={`badge ${getStatusClass(item.status)}`}>{getStatusLabel(item.status)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>
      </main>
      <Footer />
    </>
  );
};

export default Dashboard;

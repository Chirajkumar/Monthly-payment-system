import { useEffect, useState } from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiTrendingUp, FiDownload } from 'react-icons/fi';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import Loading from '../common/Loading';
import { getMembers, getMonthlyStatus, getStatistics, verifyPayment } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

const verificationYears = Array.from({ length: 2100 - 2024 + 1 }, (_, index) => 2024 + index);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [monthlyStatus, setMonthlyStatus] = useState([]);
  const [monthlyPaidCount, setMonthlyPaidCount] = useState(0);
  const [monthlyPendingCount, setMonthlyPendingCount] = useState(0);
  const [stats, setStats] = useState({
    totalMembers: 0,
    currentMonth: { paid: 0, pending: 0, total: 0 },
    totalCollected: 0,
    monthlyStats: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [verifying, setVerifying] = useState(null);
  const [showPendingMembers, setShowPendingMembers] = useState(false);

  const fetchData = async (month, year) => {
    setLoading(true);
    try {
      const [membersRes, statusRes, statsRes] = await Promise.all([
        getMembers({ limit: 20 }),
        getMonthlyStatus({ month: month || selectedMonth, year: year || selectedYear }),
        getStatistics(),
      ]);

      console.log(`Monthly Status for ${month || selectedMonth} ${year || selectedYear}:`, statusRes.data);
      const monthlyStatuses = statusRes.data.data || [];
      const paidStatuses = monthlyStatuses.filter(({ payment }) =>
        payment && ['paid', 'verified'].includes(payment.status)
      );
      const totalMonthlyMembers = Number(
        statusRes.data.totalMembers ??
        membersRes.data.pagination?.total ??
        membersRes.data.members?.length ??
        0
      );
      setMembers(membersRes.data.members || []);
      setMonthlyStatus(monthlyStatuses);
      setMonthlyPaidCount(paidStatuses.length);
      setMonthlyPendingCount(Math.max(totalMonthlyMembers - paidStatuses.length, 0));
      setStats(statsRes.data.statistics || stats);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    fetchData(month, selectedYear);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    fetchData(selectedMonth, year);
  };

  const handleVerify = async (paymentId, status) => {
    setVerifying(paymentId);
    try {
      const response = await verifyPayment(paymentId, { status });
      console.log('Payment verified:', response);
      await fetchData(selectedMonth, selectedYear);
    } catch (error) {
      console.error('Failed to update payment', error);
      alert('Failed to update payment: ' + (error.response?.data?.message || error.message));
    } finally {
      setVerifying(null);
    }
  };

  const getStatusText = (status) => {
    if (status === 'verified' || status === 'paid') return 'Paid';
    if (status === 'rejected') return 'Rejected';
    if (status === 'cancelled') return 'Cancelled';
    return status || 'Pending';
  };

  const downloadSheet = () => {
    const rows = [
      ['Name', 'Member ID', 'Amount (Rs)', 'Payment Method', 'Paid To', 'Status']
    ];

    visibleMonthlyStatus.forEach(({ member, payment }) => {
      rows.push([
        member.name,
        member.memberId,
        payment?.amount || 200,
        payment?.paymentMethod || '',
        payment?.paidTo || '',
        getStatusText(payment?.status)
      ]);
    });

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monthly-verification-${selectedMonth}-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const visibleMonthlyStatus = monthlyStatus || [];

  const pendingMembers = (monthlyStatus || []).filter(({ payment }) =>
    !payment || !['paid', 'verified'].includes(payment.status)
  );
  const monthlyMemberIds = new Set((monthlyStatus || []).map(({ member }) => String(member?.id)));
  const missingMembers = (members || [])
    .filter((member) => !monthlyMemberIds.has(String(member._id)))
    .map((member) => ({
      member: {
        id: member._id,
        name: member.name,
        memberId: member.memberId,
        email: member.email
      },
      payment: null
    }));
  const displayedPendingMembers = [...pendingMembers, ...missingMembers];

  const openPaymentProof = (url) => {
    if (!url) return;

    if (url.startsWith('data:')) {
      try {
        const matches = url.match(/^data:(image\/.+?);base64,(.*)$/i);
        if (!matches) {
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }

        const mimeType = matches[1] || 'image/png';
        const base64Data = matches[2];
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        return;
      } catch (error) {
        console.error('Failed to open proof as blob:', error);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!user) return <Loading text="Loading admin portal..." />;

  return (
    <>
      <Navbar />
      <main className="page-shell admin-shell">
        <section className="hero-panel admin-hero">
          <div>
            <p className="eyebrow">Admin overview</p>
            <h2>Welcome, {user.name}</h2>
          </div>
          <div className="hero-stats admin-stats">
            <div className="metric-card primary">
              <FiUsers />
              <div>
                <strong>{stats.totalMembers || 0}</strong>
                <span>Members</span>
              </div>
            </div>
            <div className="metric-card success">
              <FiCheckCircle />
              <div>
                <strong>{monthlyPaidCount}</strong>
                <span>Paid in {selectedMonth}</span>
              </div>
            </div>
            <button
              type="button"
              className="metric-card warning pending-trigger"
              onClick={() => setShowPendingMembers((isVisible) => !isVisible)}
              aria-expanded={showPendingMembers}
              aria-controls="pending-members"
            >
              <FiClock />
              <div>
                <strong>{monthlyPendingCount}</strong>
                <span>Pending in {selectedMonth}</span>
              </div>
            </button>
          </div>
        </section>

        {showPendingMembers && (
          <section className="panel pending-members-panel" id="pending-members">
            <div className="panel-header">
              <h3>Members who have not paid {selectedMonth}</h3>
              <span className="badge pending">{monthlyPendingCount} pending</span>
            </div>
            {displayedPendingMembers.length === 0 ? (
              <p className="empty-state">All active members have paid for this month.</p>
            ) : (
              <div className="member-list">
                {displayedPendingMembers.map(({ member, payment }) => (
                  <div className="member-item" key={member.id}>
                    <div>
                      <strong>{member.name}</strong>
                      <small>{member.memberId} · {member.email || 'No email'}</small>
                    </div>
                    <span className="badge pending">{payment ? 'Payment pending' : 'Not paid'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="stats-grid admin-grid">
          <div className="stat-box">
            <FiTrendingUp />
            <div>
              <small>Total collected</small>
              <strong>Rs {stats.totalCollected || 0}</strong>
            </div>
          </div>
        </section>

        <section className="admin-layout">
          <div className="panel">
            <div className="panel-header">
              <h3>Members</h3>
            </div>
            <div className="member-list">
              {members.length === 0 ? (
                <p className="empty-state">No members found.</p>
              ) : (
                members.map((member) => (
                  <div className="member-item" key={member._id}>
                    <div>
                      <strong>{member.name}</strong>
                      <small>{member.memberId} · {member.email || 'No email'}</small>
                    </div>
                    <span className={`badge ${member.isActive ? 'verified' : 'pending'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Monthly verification</h3>
              <div className="admin-controls">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  style={{ width: '100px' }}
                >
                  {verificationYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button type="button" className="small-btn success" onClick={downloadSheet}>
                  <FiDownload /> Download
                </button>
              </div>
            </div>
            <div className="verification-list">
              {loading ? (
                <Loading text="Loading payments..." />
              ) : visibleMonthlyStatus.length === 0 ? (
                <p className="empty-state">No payment records for this month.</p>
              ) : (
                visibleMonthlyStatus.map(({ member, payment }) => (
                  <div className="verification-item" key={member.id}>
                    <div>
                      <strong>{payment?.payerName || member.name}</strong>
                      <small>{member.memberId} · Rs {payment?.amount || 200}</small>
                      {payment?.paymentMethod === 'cash' && payment.paidTo && (
                        <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                          Cash given to: <strong>{payment.paidTo}</strong>
                        </small>
                      )}
                      {payment?.paymentMethod === 'online' && payment.paymentProof && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <img
                            src={payment.paymentProof}
                            alt="Payment proof"
                            style={{
                              display: 'block',
                              width: '180px',
                              maxWidth: '100%',
                              height: 'auto',
                              borderRadius: '8px',
                              border: '1px solid #dfe6ee',
                              background: '#fff',
                              objectFit: 'cover'
                            }}
                          />
                          <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
                            <button
                              type="button"
                              onClick={() => openPaymentProof(payment.paymentProof)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: '#2563eb',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                font: 'inherit',
                                minHeight: '44px',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              View Payment Proof
                            </button>
                          </small>
                        </div>
                      )}
                    </div>
                    <div className="verification-actions">
                      <span className={`badge ${payment?.status || 'pending'}`}>{getStatusText(payment?.status)}</span>
                      {payment?._id && (
                        <button
                          type="button"
                          className="small-btn danger"
                          onClick={() => handleVerify(payment._id, 'rejected')}
                          disabled={verifying === payment._id}
                        >
                          {verifying === payment._id ? 'Updating...' : 'Rejected'}
                        </button>
                      )}
                    </div>
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

export default AdminDashboard;

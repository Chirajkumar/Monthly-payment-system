import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiCalendar, FiShield, FiMail, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import namoLogo from '../../assets/namo-logo.png';

const Login = () => {
  const navigate = useNavigate();
  const { login, registerMember, adminLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('member');
  const [memberMode, setMemberMode] = useState('login');
  const [memberForm, setMemberForm] = useState({ name: '', dateOfBirth: '' });
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = memberMode === 'register'
      ? await registerMember(memberForm.name, memberForm.dateOfBirth)
      : await login(memberForm.name, memberForm.dateOfBirth);
    setLoading(false);

    if (result.success && memberMode === 'login') {
      navigate('/dashboard');
    } else if (result.success) {
      setMemberMode('login');
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await adminLogin(adminForm.email, adminForm.password);
    setLoading(false);

    if (result.success) {
      navigate('/admin');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-block">
          <img src={namoLogo} alt="Namo Friends Kenjila" className="brand-logo" />
          <h1 className="brand-title">
            Namo Friends <span>Kenjila</span>
          </h1>
          <p>Monthly payment management for members and administrators.</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={activeTab === 'member' ? 'active' : ''}
            onClick={() => setActiveTab('member')}
          >
            <FiUser /> Member
          </button>
          <button
            type="button"
            className={activeTab === 'admin' ? 'active' : ''}
            onClick={() => setActiveTab('admin')}
          >
            <FiShield /> Admin
          </button>
        </div>

        {activeTab === 'member' ? (
          <form onSubmit={handleMemberSubmit} className="auth-form">
            {memberMode === 'register' && <h2>Register as a member</h2>}
            <label>
              <span>Full name</span>
              <input
                type="text"
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                placeholder="Enter your name"
                required
              />
            </label>

            <label>
              <span>Date of birth</span>
              <input
                type="date"
                value={memberForm.dateOfBirth}
                onChange={(e) => setMemberForm({ ...memberForm, dateOfBirth: e.target.value })}
                required
              />
            </label>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading
                ? (memberMode === 'register' ? 'Registering...' : 'Signing in...')
                : (memberMode === 'register' ? 'Register as Member' : 'Login as Member')}
              <FiArrowRight />
            </button>
            <button
              type="button"
              className="auth-mode-toggle"
              disabled={loading}
              onClick={() => setMemberMode(memberMode === 'login' ? 'register' : 'login')}
            >
              {memberMode === 'register'
                ? 'Already registered? Log in'
                : 'New member? Register'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminSubmit} className="auth-form">
            <label>
              <span>Email</span>
              <input
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                placeholder="admin@kenjila.com"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </label>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Login as Admin'} <FiArrowRight />
            </button>
          </form>
        )}

        <div className="info-strip">
          <div><FiCalendar /> Monthly Dues</div>
          <div><FiMail /> Quick verification</div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiHome, FiLogOut, FiShield, FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import namoLogo from '../../assets/namo-logo.png';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <header className={`topbar ${menuOpen ? 'topbar--open' : ''}`}>
      <div className="topbar__brand">
        <img src={namoLogo} alt="Namo Friends Kenjila" className="topbar__logo" />
        <div>
          <span className="brand-name">Namo Friends Kenjila</span>
          <small>{isAdmin ? 'Admin portal' : 'Member portal'}</small>
        </div>
      </div>

      <button
        type="button"
        className="hamburger-btn"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <FiX /> : <FiMenu />}
      </button>

      <nav className="topbar__nav">
        {!isAdmin ? (
          <NavLink to="/dashboard"><FiHome /> Home</NavLink>
        ) : (
          <NavLink to="/admin"><FiShield /> Dashboard</NavLink>
        )}
      </nav>

      <div className="topbar__profile">
        <span>{user?.name || 'Member'}</span>
        <button type="button" className="logout-btn" onClick={logout}>
          <FiLogOut /> <Link to="/login">Logout</Link>
        </button>
      </div>
    </header>
  );
};

export default Navbar;

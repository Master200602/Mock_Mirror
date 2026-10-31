import { Link, useLocation } from 'react-router-dom';
import { Mic } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="logo-icon">
            <Mic size={24} color="#0a0a1a" />
          </div>
          <span className="brand-text">MockMirror</span>
        </Link>
        <div className="navbar-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/candidate-info" 
            className={`nav-btn ${location.pathname.includes('/candidate-info') || location.pathname.includes('/setup') || location.pathname.includes('/interview') ? 'active' : ''}`}
          >
            Start Interview
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Support Desk</Link>
      <div className="nav-right">
        {user ? (
          <>
            {user.role === 'user' && <Link to="/tickets/new">New Ticket</Link>}
            <span className="who">{user.name} ({user.role})</span>
            <button
              className="btn btn-light"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

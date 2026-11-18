import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function Dashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/tickets', { params: filter ? { status: filter } : {} })
      .then((res) => setTickets(res.data))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    if (user.role === 'admin') api.get('/tickets/stats').then((res) => setStats(res.data));
  }, [user.role]);

  return (
    <div>
      <div className="row">
        <h2>{user.role === 'admin' ? 'All Tickets' : 'My Tickets'}</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {stats && (
        <div className="stats">
          {STATUSES.map((s) => (
            <div className="card stat" key={s}>
              <strong>{stats[s]}</strong>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : tickets.length === 0 ? (
        <p>No tickets found.</p>
      ) : (
        <div className="list">
          {tickets.map((t) => (
            <Link to={`/tickets/${t._id}`} className="card ticket" key={t._id}>
              <div className="row">
                <strong>{t.title}</strong>
                <StatusBadge status={t.status} />
              </div>
              <small>
                {t.category} · {t.priority} priority
                {user.role === 'admin' && ` · by ${t.createdBy?.name}`} ·{' '}
                {new Date(t.createdAt).toLocaleDateString()}
              </small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

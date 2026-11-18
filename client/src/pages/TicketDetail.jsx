import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const loadMessages = () =>
    api.get(`/tickets/${id}/messages`).then((res) => setMessages(res.data));

  useEffect(() => {
    api
      .get(`/tickets/${id}`)
      .then((res) => setTicket(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load ticket'));
    loadMessages();
    // light polling so user and admin see each other's replies
    const timer = setInterval(loadMessages, 8000);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { data } = await api.post(`/tickets/${id}/messages`, { text });
      setMessages((m) => [...m, data]);
      setText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send message');
    }
  };

  const changeStatus = async (status) => {
    const { data } = await api.patch(`/tickets/${id}/status`, { status });
    setTicket((t) => ({ ...t, status: data.status, assignedTo: data.assignedTo || t.assignedTo }));
  };

  const remove = async () => {
    if (!window.confirm('Delete this ticket and its messages?')) return;
    await api.delete(`/tickets/${id}`);
    navigate('/');
  };

  if (error && !ticket) return <p className="error">{error}</p>;
  if (!ticket) return <p>Loading...</p>;

  return (
    <div>
      <div className="card">
        <div className="row">
          <h2>{ticket.title}</h2>
          <StatusBadge status={ticket.status} />
        </div>
        <small>
          {ticket.category} · {ticket.priority} priority · raised by {ticket.createdBy?.name} on{' '}
          {new Date(ticket.createdAt).toLocaleString()}
        </small>
        <p>{ticket.description}</p>

        {user.role === 'admin' && (
          <div className="row">
            <label>
              Status:{' '}
              <select value={ticket.status} onChange={(e) => changeStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button className="btn btn-danger" onClick={remove}>Delete</button>
          </div>
        )}
      </div>

      <h3>Conversation</h3>
      <div className="card chat">
        {messages.length === 0 && <p>No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.sender?._id === user.id;
          return (
            <div key={m._id} className={`bubble ${mine ? 'mine' : 'theirs'}`}>
              <small>
                {m.sender?.name} ({m.sender?.role}) · {new Date(m.createdAt).toLocaleTimeString()}
              </small>
              <p>{m.text}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {ticket.status !== 'Closed' ? (
        <form className="row send" onSubmit={send}>
          <input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn">Send</button>
        </form>
      ) : (
        <p>This ticket is closed.</p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

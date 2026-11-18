import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function NewTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    priority: 'Medium',
  });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/tickets', form);
      navigate(`/tickets/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create ticket');
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Create ticket</h2>
      {error && <p className="error">{error}</p>}
      <input placeholder="Title" value={form.title} onChange={set('title')} required />
      <textarea
        rows={5}
        placeholder="Describe your issue"
        value={form.description}
        onChange={set('description')}
        required
      />
      <select value={form.category} onChange={set('category')}>
        {['Technical', 'Billing', 'Account', 'General'].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select value={form.priority} onChange={set('priority')}>
        {['Low', 'Medium', 'High'].map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <button className="btn">Submit ticket</button>
    </form>
  );
}

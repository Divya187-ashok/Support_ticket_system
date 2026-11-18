const express = require('express');
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Loads a ticket and checks the caller may access it (owner or admin)
async function loadTicket(req, res, next) {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid ticket id' });
  const ticket = await Ticket.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email');
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  const isOwner = ticket.createdBy._id.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You cannot access this ticket' });
  }
  req.ticket = ticket;
  next();
}

// POST /api/tickets  - create a ticket
router.post('/', async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    const ticket = await Ticket.create({
      title,
      description,
      category,
      priority,
      createdBy: req.user._id,
    });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/tickets  - users see their own, admins see all (optional ?status=)
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tickets/stats  - admin dashboard counts
router.get('/stats', restrictTo('admin'), async (req, res) => {
  const rows = await Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const stats = { Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 };
  rows.forEach((r) => (stats[r._id] = r.count));
  res.json(stats);
});

// GET /api/tickets/:id
router.get('/:id', loadTicket, (req, res) => res.json(req.ticket));

// PUT /api/tickets/:id  - owner can edit title/description/priority while Open
router.put('/:id', loadTicket, async (req, res) => {
  try {
    const t = req.ticket;
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && t.status !== 'Open') {
      return res.status(400).json({ message: 'Only open tickets can be edited' });
    }
    ['title', 'description', 'category', 'priority'].forEach((f) => {
      if (req.body[f] !== undefined) t[f] = req.body[f];
    });
    await t.save();
    res.json(t);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/tickets/:id/status  - admin only
router.patch('/:id/status', restrictTo('admin'), loadTicket, async (req, res) => {
  const { status } = req.body;
  if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  req.ticket.status = status;
  if (status === 'In Progress' && !req.ticket.assignedTo) req.ticket.assignedTo = req.user._id;
  await req.ticket.save();
  res.json(req.ticket);
});

// DELETE /api/tickets/:id  - admin only
router.delete('/:id', restrictTo('admin'), loadTicket, async (req, res) => {
  await Message.deleteMany({ ticket: req.ticket._id });
  await req.ticket.deleteOne();
  res.json({ message: 'Ticket deleted' });
});

// GET /api/tickets/:id/messages
router.get('/:id/messages', loadTicket, async (req, res) => {
  const messages = await Message.find({ ticket: req.ticket._id })
    .populate('sender', 'name role')
    .sort({ createdAt: 1 });
  res.json(messages);
});

// POST /api/tickets/:id/messages  - user <-> admin conversation
router.post('/:id/messages', loadTicket, async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ message: 'Message text is required' });
  if (req.ticket.status === 'Closed') {
    return res.status(400).json({ message: 'Ticket is closed' });
  }
  const msg = await Message.create({ ticket: req.ticket._id, sender: req.user._id, text });
  await msg.populate('sender', 'name role');
  res.status(201).json(msg);
});

module.exports = router;

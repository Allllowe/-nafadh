const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

// In-memory storage
const inboxes = new Map();

function generateAddress() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let addr = '';
  for (let i = 0; i < 8; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr + '@nafadh.com';   // ← هنا غيرناه
}

// Create inbox
app.post('/api/inbox', (req, res) => {
  const address = generateAddress();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  inboxes.set(address, { address, messages: [], expiresAt });

  res.json({ address, messages: [], expiresAt });
});

// Get messages
app.get('/api/inbox/:address/messages', (req, res) => {
  const address = req.params.address;
  const inbox = inboxes.get(address);

  if (!inbox || new Date(inbox.expiresAt) < new Date()) {
    inboxes.delete(address);
    return res.status(404).json({ message: 'Inbox not found or expired' });
  }

  res.json({ messages: inbox.messages });
});

// Extend
app.post('/api/inbox/:address/extend', (req, res) => {
  const address = req.params.address;
  const inbox = inboxes.get(address);
  if (!inbox) return res.status(404).json({ message: 'Not found' });

  inbox.expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  res.json({ expiresAt: inbox.expiresAt });
});

// Delete messages
app.delete('/api/inbox/:address/messages', (req, res) => {
  const address = req.params.address;
  const inbox = inboxes.get(address);
  if (inbox) inbox.messages = [];
  res.status(204).send();
});

// Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Cleanup
setInterval(() => {
  const now = new Date();
  for (const [addr, inbox] of inboxes) {
    if (new Date(inbox.expiresAt) < now) inboxes.delete(addr);
  }
}, 60000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

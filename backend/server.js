const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const inboxes = new Map();

function generateAddress() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let addr = '';
  for (let i = 0; i < 8; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr + '@nafadhmail.com';
}

app.post('/api/inbox', (req, res) => {
  const address = generateAddress();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const inbox = {
    address,
    messages: [],
    expiresAt,
    createdAt: new Date().toISOString()
  };

  inboxes.set(address, inbox);

  res.json({ address, messages: [], expiresAt });
});

app.get('/api/inbox/:address/messages', (req, res) => {
  const { address } = req.params;
  const inbox = inboxes.get(address);

  if (!inbox || new Date(inbox.expiresAt) < new Date()) {
    inboxes.delete(address);
    return res.status(404).json({ message: 'Inbox not found or expired' });
  }

  res.json({ messages: inbox.messages });
});

app.post('/api/inbox/:address/extend', (req, res) => {
  const { address } = req.params;
  const inbox = inboxes.get(address);

  if (!inbox) return res.status(404).json({ message: 'Inbox not found' });

  inbox.expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  res.json({ expiresAt: inbox.expiresAt });
});

app.delete('/api/inbox/:address/messages', (req, res) => {
  const { address } = req.params;
  const inbox = inboxes.get(address);
  if (inbox) inbox.messages = [];
  res.status(204).send();
});

setInterval(() => {
  const now = new Date();
  for (const [addr, inbox] of inboxes) {
    if (new Date(inbox.expiresAt) < now) inboxes.delete(addr);
  }
}, 60000);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

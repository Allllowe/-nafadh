const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ====================== TEMPORARY EMAIL API ======================

// In-memory storage
let inboxes = new Map(); // address -> inbox object

// Helper: generate random address
function generateAddress() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let addr = '';
  for (let i = 0; i < 8; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr + '@nafadh.app';
}

// Create new inbox
app.post('/api/inbox', (req, res) => {
  const address = generateAddress();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

  const inbox = {
    address,
    messages: [],
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  };

  inboxes.set(address, inbox);

  res.json({
    address,
    messages: [],
    expiresAt: inbox.expiresAt
  });
});

// Get messages
app.get('/api/inbox/:address/messages', (req, res) => {
  const { address } = req.params;
  const inbox = inboxes.get(address);

  if (!inbox) {
    return res.status(404).json({ message: 'Inbox not found or expired' });
  }

  // Check expiry
  if (new Date(inbox.expiresAt) < new Date()) {
    inboxes.delete(address);
    return res.status(404).json({ message: 'Inbox expired' });
  }

  res.json({ messages:

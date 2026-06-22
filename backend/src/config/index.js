require('dotenv').config();

function parseOrigins(raw){
  if(!raw || raw.trim() === '*') return '*';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  inboxDomain: process.env.INBOX_DOMAIN || 'nafadh.com',
  inboxTtlMinutes: parseInt(process.env.INBOX_TTL_MINUTES, 10) || 20,
  corsOrigin: parseOrigins(process.env.CORS_ORIGIN),
  inboundWebhookSecret: process.env.INBOUND_WEBHOOK_SECRET || ''
};

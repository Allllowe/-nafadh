const config = require('../config');
const { randomAddrSegment, randomId } = require('../utils/randomId');
const { timeAgoArabic } = require('../utils/timeAgo');

/**
 * In-memory inbox store.
 *
 * address -> {
 *   address, createdAt, expiresAt,
 *   messages: Map(id -> { id, subject, preview, sender, color, initial, read, receivedAt })
 * }
 *
 * NOTE: this is intentionally in-memory and resets on server restart.
 * Swap this module for a Redis/Postgres-backed implementation before
 * running multiple instances or needing persistence across restarts —
 * every other layer (controllers/routes) only depends on the functions
 * exported below, so the storage backend can change without touching them.
 */
const inboxes = new Map();

const AVATAR_COLORS = ['#8b5cf6', '#34d399', '#60a5fa', '#fbbf24', '#f472b6'];

function ttlMs(){
  return config.inboxTtlMinutes * 60 * 1000;
}

function isExpired(inbox){
  return Date.now() > inbox.expiresAt;
}

function purgeExpired(){
  for(const [address, inbox] of inboxes){
    if(isExpired(inbox)) inboxes.delete(address);
  }
}
// Lazily sweep expired inboxes every minute so memory doesn't grow forever.
setInterval(purgeExpired, 60 * 1000).unref();

function seedDemoMessages(){
  // Generic, clearly-fake demo content so a freshly created inbox isn't
  // empty in development. Real inboxes fill up via the inbound webhook
  // (see receiveInboundMessage) once connected to an actual mail provider.
  const now = Date.now();
  const demo = [
    { offsetMin: 2, subject: 'تأكيد إنشاء حسابك', preview: 'مرحباً بك! يرجى مراجعة بيانات حسابك الجديد من خلال لوحة التحكم.', sender: 'team@example-app.com', initial: 'A', read: false },
    { offsetMin: 6, subject: 'رمز تحقق تجريبي', preview: 'هذا رمز تحقق تجريبي لأغراض الاختبار فقط. صالح لمدة 10 دقائق.', sender: 'verify@demo-service.test', initial: 'V', read: false },
    { offsetMin: 14, subject: 'فاتورتك الشهرية جاهزة', preview: 'يمكنك الاطلاع على تفاصيل الفاتورة والدفع من خلال الرابط المرفق.', sender: 'billing@sample-co.io', initial: 'B', read: true }
  ];
  return demo.map((m, i) => ({
    id: randomId(),
    subject: m.subject,
    preview: m.preview,
    sender: m.sender,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    initial: m.initial,
    read: m.read,
    receivedAt: new Date(now - m.offsetMin * 60 * 1000).toISOString()
  }));
}

function serializeMessage(m){
  return {
    id: m.id,
    time: timeAgoArabic(m.receivedAt),
    subject: m.subject,
    preview: m.preview,
    sender: m.sender,
    color: m.color,
    initial: m.initial,
    read: m.read
  };
}

function createInbox(){
  const address = randomAddrSegment(7) + '@' + config.inboxDomain;
  const messages = new Map();
  seedDemoMessages().forEach(m => messages.set(m.id, m));

  const inbox = {
    address,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs(),
    messages
  };
  inboxes.set(address, inbox);
  return inbox;
}

function getInbox(address){
  const inbox = inboxes.get(address);
  if(!inbox || isExpired(inbox)){
    if(inbox) inboxes.delete(address);
    return null;
  }
  return inbox;
}

function listMessages(address){
  const inbox = getInbox(address);
  if(!inbox) return null;
  return Array.from(inbox.messages.values())
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
    .map(serializeMessage);
}

function getMessage(address, id){
  const inbox = getInbox(address);
  if(!inbox) return null;
  const m = inbox.messages.get(id);
  return m ? serializeMessage(m) : null;
}

function markRead(address, id){
  const inbox = getInbox(address);
  if(!inbox) return null;
  const m = inbox.messages.get(id);
  if(!m) return null;
  m.read = true;
  return serializeMessage(m);
}

function deleteAllMessages(address){
  const inbox = getInbox(address);
  if(!inbox) return false;
  inbox.messages.clear();
  return true;
}

function deleteInbox(address){
  return inboxes.delete(address);
}

function extendInbox(address, minutes){
  const inbox = getInbox(address);
  if(!inbox) return null;
  inbox.expiresAt += minutes * 60 * 1000;
  return inbox.expiresAt;
}

/**
 * Entry point for connecting a REAL inbound-mail provider.
 *
 * Wire this up by pointing your mail provider's inbound webhook
 * (Mailgun Routes, SendGrid Inbound Parse, Postmark Inbound, or a
 * custom SMTP-receiving server using a package like `smtp-server`)
 * at POST /api/inbox/:address/messages, authenticated with the
 * INBOUND_WEBHOOK_SECRET header. See inbox.controller.js.
 */
function receiveInboundMessage(address, { subject, preview, sender, initial, color }){
  const inbox = getInbox(address);
  if(!inbox) return null;
  const message = {
    id: randomId(),
    subject: subject || '(بدون عنوان)',
    preview: preview || '',
    sender: sender || 'unknown@unknown.com',
    color: color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    initial: initial || (sender ? sender[0].toUpperCase() : '?'),
    read: false,
    receivedAt: new Date().toISOString()
  };
  inbox.messages.set(message.id, message);
  return serializeMessage(message);
}

module.exports = {
  createInbox,
  getInbox,
  listMessages,
  getMessage,
  markRead,
  deleteAllMessages,
  deleteInbox,
  extendInbox,
  receiveInboundMessage
};

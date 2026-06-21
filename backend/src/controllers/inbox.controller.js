const config = require('../config');
const inboxService = require('../services/inbox.service');

function createInbox(req, res){
  const inbox = inboxService.createInbox();
  res.status(201).json({
    address: inbox.address,
    expiresAt: new Date(inbox.expiresAt).toISOString(),
    messages: inboxService.listMessages(inbox.address)
  });
}

function listMessages(req, res){
  const { address } = req.params;
  const messages = inboxService.listMessages(address);
  if(messages === null){
    return res.status(404).json({ message: 'الصندوق غير موجود أو انتهت صلاحيته' });
  }
  res.json({ address, messages });
}

function getMessage(req, res){
  const { address, id } = req.params;
  const message = inboxService.getMessage(address, id);
  if(message === null){
    return res.status(404).json({ message: 'الرسالة غير موجودة' });
  }
  res.json({ message });
}

function markRead(req, res){
  const { address, id } = req.params;
  const message = inboxService.markRead(address, id);
  if(message === null){
    return res.status(404).json({ message: 'الرسالة أو الصندوق غير موجود' });
  }
  res.json({ message });
}

function deleteAllMessages(req, res){
  const { address } = req.params;
  const ok = inboxService.deleteAllMessages(address);
  if(!ok){
    return res.status(404).json({ message: 'الصندوق غير موجود أو انتهت صلاحيته' });
  }
  res.status(204).end();
}

function deleteInbox(req, res){
  const { address } = req.params;
  const ok = inboxService.deleteInbox(address);
  if(!ok){
    return res.status(404).json({ message: 'الصندوق غير موجود' });
  }
  res.status(204).end();
}

function extendInbox(req, res){
  const { address } = req.params;
  const minutes = Math.min(Math.max(parseInt((req.body || {}).minutes, 10) || 10, 1), 60);
  const newExpiry = inboxService.extendInbox(address, minutes);
  if(newExpiry === null){
    return res.status(404).json({ message: 'الصندوق غير موجود أو انتهت صلاحيته' });
  }
  res.json({ expiresAt: new Date(newExpiry).toISOString() });
}

/**
 * Webhook target for a real inbound-mail provider. Protected by a shared
 * secret so random callers on the internet can't inject fake mail.
 * See inbox.service.js → receiveInboundMessage for wiring instructions.
 */
function receiveInboundMessage(req, res){
  const providedSecret = req.get('X-Webhook-Secret');
  if(!config.inboundWebhookSecret || providedSecret !== config.inboundWebhookSecret){
    return res.status(401).json({ message: 'Unauthorized webhook call' });
  }
  const { address } = req.params;
  const { subject, preview, sender, initial, color } = req.body || {};
  const message = inboxService.receiveInboundMessage(address, { subject, preview, sender, initial, color });
  if(message === null){
    return res.status(404).json({ message: 'الصندوق غير موجود أو انتهت صلاحيته' });
  }
  res.status(201).json({ message });
}

module.exports = {
  createInbox,
  listMessages,
  getMessage,
  markRead,
  deleteAllMessages,
  deleteInbox,
  extendInbox,
  receiveInboundMessage
};

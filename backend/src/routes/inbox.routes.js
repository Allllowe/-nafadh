const express = require('express');
const controller = require('../controllers/inbox.controller');

const router = express.Router();

router.post('/', controller.createInbox);
router.get('/:address/messages', controller.listMessages);
router.get('/:address/messages/:id', controller.getMessage);
router.patch('/:address/messages/:id/read', controller.markRead);
router.delete('/:address/messages', controller.deleteAllMessages);
router.delete('/:address', controller.deleteInbox);
router.post('/:address/extend', controller.extendInbox);

// Inbound-mail provider webhook (Mailgun / SendGrid / custom SMTP relay).
// Requires the X-Webhook-Secret header — see .env.example.
router.post('/:address/messages', controller.receiveInboundMessage);

module.exports = router;

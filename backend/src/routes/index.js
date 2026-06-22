const express = require('express');
const inboxRoutes = require('./inbox.routes');
const toolsRoutes = require('./tools.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'nafadh-backend', time: new Date().toISOString() });
});

router.use('/inbox', inboxRoutes);
router.use('/tools', toolsRoutes);

module.exports = router;

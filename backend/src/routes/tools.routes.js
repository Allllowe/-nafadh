const express = require('express');
const controller = require('../controllers/tools.controller');

const router = express.Router();

router.post('/username', controller.username);
router.post('/fake-data', controller.fakeData);
router.post('/qrcode', controller.qrcode);
router.post('/base64', controller.base64);

module.exports = router;

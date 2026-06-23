const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

// خدمة ملفات الواجهة الثابتة (من backend/src → ../../frontend).
const frontendDir = path.join(__dirname, '../../frontend');
app.use(express.static(frontendDir));

// أي مسار ليس API وليس ملفاً ثابتاً → أعِد index.html (يصلح "Not Found").
// مسارات /api غير المعروفة تُترك لـ notFound لتُرجع JSON بدل الصفحة.
app.get('*', (req, res, next) => {
  if(req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;

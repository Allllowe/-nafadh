const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({ service: 'nafadh-backend', status: 'running', docs: '/api/health' });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

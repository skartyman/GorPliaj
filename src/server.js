const express = require('express');
const { PORT } = require('./config/env');

function startServer() {
  const bootstrapApp = express();
  let isReady = false;

  bootstrapApp.get('/healthz', (_req, res) => {
    res.status(200).json({ status: isReady ? 'ok' : 'starting' });
  });

  const server = bootstrapApp.listen(PORT, '0.0.0.0', () => {
    console.log(`ГорПляж app is running on http://0.0.0.0:${PORT}`);

    process.nextTick(() => {
      try {
        const app = require('./app');
        bootstrapApp.use(app);
        isReady = true;
        console.log('ГорПляж routes initialized');
      } catch (error) {
        console.error('Failed to initialize application routes:', error);
        process.exit(1);
      }
    });
  });

  return server;
}

module.exports = { startServer };

const app = require('./app');
const { PORT } = require('./config/env');

function startServer() {
  return app.listen(PORT, () => {
    console.log(`ГорПляж app is running on http://localhost:${PORT}`);
  });
}

module.exports = { startServer };

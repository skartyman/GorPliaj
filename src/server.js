const app = require('./app');
const { PORT } = require('./config/env');

function startServer() {
  return app.listen(PORT, "0.0.0.0", () => {
    console.log(`ГорПляж app is running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { startServer };

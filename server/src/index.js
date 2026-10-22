import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Postern API listening on http://localhost:${config.port}`);
});

// Let nodemon-style restarts and container stops close cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

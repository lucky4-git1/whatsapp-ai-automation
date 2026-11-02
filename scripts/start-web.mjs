import { createServer } from 'vite';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '../apps/web');

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in Vite runner:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in Vite runner:', reason);
});

async function start() {
  const server = await createServer({
    root: webRoot,
    configFile: path.join(webRoot, 'vite.config.ts'),
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  });

  await server.listen();
  console.log(`Vite development server active at http://localhost:3000/`);

  // Forwarder on port 3020 -> 3000
  try {
    const bridge = http.createServer((clientReq, clientRes) => {
      const options = {
        hostname: '127.0.0.1',
        port: 3000,
        path: clientReq.url,
        method: clientReq.method,
        headers: { ...clientReq.headers, host: 'localhost:3000' },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes, { end: true });
      });

      proxyReq.on('error', () => {
        clientRes.writeHead(502);
        clientRes.end('Bad gateway');
      });

      clientReq.pipe(proxyReq, { end: true });
    });

    bridge.listen(3020, '0.0.0.0', () => {
      console.log(`Port 3020 alias forwarder active -> http://localhost:3000/`);
    });
  } catch (err) {
    console.log('Bridge port 3020 skipped:', err.message);
  }

  // Explicitly prevent Node event loop from exiting
  setInterval(() => {}, 1000 * 60 * 60);
}

start().catch((err) => {
  console.error('Failed to start Vite server:', err);
  process.exit(1);
});

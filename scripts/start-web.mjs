import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '../apps/web');

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
}

start().catch((err) => {
  console.error('Failed to start Vite server:', err);
  process.exit(1);
});

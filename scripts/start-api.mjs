import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const api = spawn('npx', ['tsx', 'watch', 'apps/api/src/index.ts'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    API_PORT: '4002',
    NODE_ENV: 'development',
  },
});

api.on('exit', (code) => {
  console.log(`API process exited with code ${code}`);
  process.exit(code || 0);
});

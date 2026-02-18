const path = require('path');

const ROOT = __dirname;
const SERVER_DIR = path.join(ROOT, 'server');
const SCRIPT = path.join(SERVER_DIR, 'dist', 'index.js');
const LOG_DIR = path.join(ROOT, 'logs');

module.exports = {
  apps: [
    {
      name: 'roulette',
      script: SCRIPT,
      cwd: SERVER_DIR,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
        HOST: '0.0.0.0'
      },
      error_file: path.join(LOG_DIR, 'err.log'),
      out_file: path.join(LOG_DIR, 'out.log'),
      merge_logs: true,
      time: true
    }
  ]
};

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'terceiroandar-api',
      cwd: __dirname,
      script: 'apps/api/dist/main.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'terceiroandar-painel',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start apps/painel -p ' + (process.env.PANEL_PORT || '3000'),
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' }
    }
  ]
};

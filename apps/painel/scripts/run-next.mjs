import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const command = process.argv[2];
const supportedCommands = new Set(['dev', 'build', 'start']);

if (!supportedCommands.has(command)) {
  console.error('Uso: node scripts/run-next.mjs <dev|build|start>');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
const args = [nextBin, command];

if (command === 'dev' || command === 'start') {
  args.push('-p', process.env.PANEL_PORT || '3000');
}

const next = spawn(process.execPath, args, {
  env: { ...process.env, NODE_ENV: command === 'build' ? 'production' : process.env.NODE_ENV },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => next.kill(signal));
}

next.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

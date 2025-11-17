const { spawn } = require('child_process');

// Simple shim to start the app using npm scripts. Some hosts expect a
// `backend/index.js` entrypoint; this forwards to `npm run start` so the
// Next.js production server from `next start` is launched.

const cmd = process.env.NPM_CMD || 'npm';
const args = ['run', 'start'];

console.log('Starting app via:', cmd, args.join(' '));

const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });

proc.on('exit', (code, signal) => {
  if (signal) {
    console.log('Process killed with signal', signal);
    process.exit(1);
  } else {
    console.log('Process exited with code', code);
    process.exit(code);
  }
});

proc.on('error', (err) => {
  console.error('Failed to start process', err);
  process.exit(1);
});

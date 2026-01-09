// start.js
const { spawn } = require('child_process');

// '--filter', 'frontend' 를 제거하고 바로 'dev'를 호출합니다.
const child = spawn('pnpm', ['dev', '--port', '3001'], {
  shell: true,
  stdio: 'inherit',
  windowsHide: true
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit();
});
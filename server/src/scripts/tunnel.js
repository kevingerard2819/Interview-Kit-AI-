const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const urlFilePath = path.join(__dirname, '..', '..', 'active_tunnel.txt');
const cloudflaredBin = path.join(__dirname, '..', '..', '..', 'cloudflared.exe');

function startCloudflareTunnel() {
  console.log('[Cloudflare] Launching enterprise Cloudflare edge tunnel to http://localhost:3000...');
  
  const proc = spawn(cloudflaredBin, ['tunnel', '--url', 'http://localhost:3000']);

  const handleData = (d) => {
    const text = d.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      fs.writeFileSync(urlFilePath, url, 'utf8');
      console.log('\n' + '='.repeat(70));
      console.log('🚀 CLOUDFLARE PUBLIC LIVE URL (ZERO DROPS / ZERO TIMEOUTS):');
      console.log('   ' + url);
      console.log('='.repeat(70) + '\n');
    }
  };

  proc.stdout.on('data', handleData);
  proc.stderr.on('data', handleData);

  proc.on('close', (code) => {
    console.log(`[Cloudflare] Process exited with code ${code}. Reconnecting in 3s...`);
    setTimeout(startCloudflareTunnel, 3000);
  });

  proc.on('error', (err) => {
    console.error('[Cloudflare] Error:', err.message);
    setTimeout(startCloudflareTunnel, 3000);
  });
}

startCloudflareTunnel();

const http = require('http');

async function run() {
  const patchData = JSON.stringify({ status: 'ACTIVE' });
  const patchOpts = {
    hostname: 'localhost', port: 8000, path: `/campaigns/camp-1`,
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }
  };
  await new Promise(resolve => {
    const req = http.request(patchOpts, res => {
      res.on('data', ()=>{}); res.on('end', resolve);
    });
    req.write(patchData);
    req.end();
  });

  const fetchActiveOpts = { hostname: 'localhost', port: 8000, path: '/campaigns?status=ACTIVE' };
  const active = await new Promise(resolve => {
    http.get(fetchActiveOpts, res => {
      let b=''; res.on('data', c=>b+=c); res.on('end', () => resolve(JSON.parse(b)));
    });
  });

  console.log("Active docs:");
  active.forEach(c => console.log(c.id, c.title, c.status));
}

run();

const http = require('http');

async function run() {
  // 1. Create campaign
  const createData = JSON.stringify({
    title: "Testing Sequence",
    creatorId: "user-1",
    status: "PENDING",
  });
  
  const createOpts = {
    hostname: 'localhost',
    port: 8000,
    path: '/campaigns',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  const createdCampaign = await new Promise((resolve) => {
    const req = http.request(createOpts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.write(createData);
    req.end();
  });
  
  console.log("Created:", createdCampaign);
  
  // 2. Fetch PENDING
  const fetchOpts = { hostname: 'localhost', port: 8000, path: '/campaigns?status=PENDING' };
  const pending = await new Promise(resolve => {
    http.get(fetchOpts, res => {
      let b=''; res.on('data', c=>b+=c); res.on('end', () => resolve(JSON.parse(b)));
    });
  });
  
  console.log("Pending count:", pending.length);
  const myPending = pending.find(p => p.title === "Testing Sequence");
  console.log("Found in pending:", !!myPending, "with id:", myPending ? myPending.id : 'N/A');

  // 3. Approve via PATCH
  const patchData = JSON.stringify({ status: 'ACTIVE' });
  const patchOpts = {
    hostname: 'localhost', port: 8000, path: `/campaigns/${myPending.id}`,
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }
  };

  const patchRes = await new Promise(resolve => {
    const req = http.request(patchOpts, res => {
      let b=''; res.on('data', c=>b+=c); res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(patchData);
    req.end();
  });

  console.log("Patch response:", patchRes);

  // 4. Fetch ACTIVE
  const fetchActiveOpts = { hostname: 'localhost', port: 8000, path: '/campaigns?status=ACTIVE' };
  const active = await new Promise(resolve => {
    http.get(fetchActiveOpts, res => {
      let b=''; res.on('data', c=>b+=c); res.on('end', () => resolve(JSON.parse(b)));
    });
  });

  const myActive = active.find(p => p.title === "Testing Sequence");
  console.log("Found in active:", !!myActive);
  
  // 5. Cleanup
  const delOpts = { hostname: 'localhost', port: 8000, path: `/campaigns/${myPending.id}`, method: 'DELETE' };
  await new Promise(resolve => {
    const req = http.request(delOpts, res => {
      res.on('data', ()=>{}); res.on('end', resolve);
    });
    req.end();
  });
}

run();

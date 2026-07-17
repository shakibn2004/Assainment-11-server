const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test');
  const campaigns = db.collection('campaigns');

  // 1. Insert a PENDING campaign
  const doc = { title: "Test Campaign", status: "PENDING", id: "camp-test-123" };
  const insertRes = await campaigns.insertOne(doc);
  console.log("Inserted:", insertRes.insertedId);

  // 2. Perform PATCH using http
  const http = require('http');
  const data = JSON.stringify({ status: 'ACTIVE' });
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/campaigns/camp-test-123',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  await new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log("PATCH Response:", res.statusCode, body);
        resolve();
      });
    });
    req.write(data);
    req.end();
  });

  // 3. Query DB
  const updatedDoc = await campaigns.findOne({ id: "camp-test-123" });
  console.log("DB Document after PATCH:", updatedDoc);

  await campaigns.deleteOne({ id: "camp-test-123" });
  await client.close();
}
run();

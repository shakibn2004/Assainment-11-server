const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test'); // Wait, earlier I used 'sparklift', let me check what the URI defaults to or what collection is used.
  // Actually, wait, let's just use the db() from client.
  const coll = client.db().collection('campaigns');
  const all = await coll.find({}).toArray();
  console.log("Total:", all.length);
  all.forEach(c => console.log(c.title, "| status:", c.status, "| id:", c.id, "| _id:", c._id));
  await client.close();
}
run();

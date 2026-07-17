const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('sparklift');
  const campaigns = await db.collection('campaigns').find({}).toArray();
  console.log("Total campaigns:", campaigns.length);
  console.log("Statuses:", campaigns.map(c => c.status));
  await client.close();
}
run();

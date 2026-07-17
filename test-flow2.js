const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('sparklift');
  const campaigns = db.collection('campaigns');

  // Query actual campaigns
  const all = await campaigns.find({}).toArray();
  console.log("Total campaigns in sparklift:", all.length);
  for (const c of all) {
    console.log(c._id, c.id, c.status, c.title);
  }

  await client.close();
}
run();

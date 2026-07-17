const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('Assainment-11');
  const campaigns = db.collection('campaigns');

  const all = await campaigns.find({}).toArray();
  console.log("Total campaigns in Assainment-11:", all.length);
  for (const c of all) {
    console.log(c._id, c.id, c.status, c.title);
  }

  await client.close();
}
run();

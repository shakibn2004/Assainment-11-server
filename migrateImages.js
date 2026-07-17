const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI || "mongodb+srv://Assainment-11:vCt948c44PxPO2My@cluster0.ij4qzmh.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

const imgbbKey = process.env.IMGBB_KEY || "19d33e03c29754a8f29a2a16b163e7a5";

async function run() {
    try {
        await client.connect();
        const db = client.db("Assainment-11");
        const campaigns = db.collection('campaigns');

        const docs = await campaigns.find({}).toArray();
        console.log(`Found ${docs.length} campaigns`);

        for (let doc of docs) {
            if (doc.coverImage && doc.coverImage.includes("unsplash.com")) {
                console.log(`Migrating image for campaign ${doc.title}: ${doc.coverImage}`);
                
                try {
                    const formData = new URLSearchParams();
                    formData.append('image', doc.coverImage);

                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });

                    const data = await res.json();

                    if (data && data.data && data.data.url) {
                        const newUrl = data.data.url;
                        console.log(`New URL: ${newUrl}`);
                        
                        const result = await campaigns.updateOne(
                            { _id: doc._id },
                            { $set: { coverImage: newUrl } }
                        );
                        console.log(`Modified count: ${result.modifiedCount}`);
                    } else {
                        console.log(`Failed to migrate image for ${doc.title}:`, data);
                    }
                } catch (e) {
                    console.error(`Failed to migrate image for ${doc.title}:`, e.message);
                }
            } else {
                console.log(`Skipping campaign ${doc.title}, already migrated or no image.`);
            }
        }
    } finally {
        await client.close();
        console.log("Done!");
    }
}

run().catch(console.dir);

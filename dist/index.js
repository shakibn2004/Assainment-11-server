"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const mongodb_1 = require("mongodb");
const jose_1 = require("jose");
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not defined");
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const client = new mongodb_1.MongoClient(uri, {
    serverApi: {
        version: mongodb_1.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
// verify token middleware
const jwksUrl = process.env.CLIENT_URI ? `${process.env.CLIENT_URI}/api/auth/jwks` : 'http://localhost:3000/api/auth/jwks';
const JWKS = (0, jose_1.createRemoteJWKSet)(new URL(jwksUrl));
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, JWKS);
        req.user = payload;
        next();
    }
    catch (error) {
        console.log('error', error);
        return res.status(403).json({ message: "Forbidden" });
    }
};
// database and collection create and send data
async function run() {
    try {
        const db = client.db("Assainment-11");
        const campaigns = db.collection('campaigns');
        // Get all campaigns or filter by featured
        app.get('/campaigns', async (req, res) => {
            const query = {};
            if (req.query.featured === 'true') {
                query.featured = true;
            }
            if (req.query.creatorId) {
                query.creatorId = req.query.creatorId;
            }
            const result = await campaigns.find(query).toArray();
            res.send(result);
        });
        // Get single campaign by id
        app.get('/campaigns/:id', async (req, res) => {
            const id = req.params.id;
            const result = await campaigns.findOne({ id: id });
            if (!result) {
                // Try with ObjectId just in case
                try {
                    const resultByObjectId = await campaigns.findOne({ _id: new mongodb_1.ObjectId(id) });
                    if (resultByObjectId)
                        return res.send(resultByObjectId);
                }
                catch (e) { }
                return res.status(404).send({ message: "Campaign not found" });
            }
            res.send(result);
        });
        // Create campaign
        app.post('/campaigns', async (req, res) => {
            const campaign = req.body;
            // Generate id if it doesn't exist to maintain compatibility with frontend expected 'id' string
            if (!campaign.id) {
                campaign.id = `camp-${Date.now()}`;
            }
            const result = await campaigns.insertOne(campaign);
            res.send({ ...result, insertedId: result.insertedId, campaign });
            console.log("Created campaign:", campaign.id);
        });
        // Update campaign
        app.patch('/campaigns/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            delete updatedData._id; // prevent modifying _id
            const result = await campaigns.updateOne({ id: id }, { $set: updatedData });
            if (result.matchedCount === 0) {
                // Try with ObjectId
                try {
                    const resultByObjectId = await campaigns.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: updatedData });
                    if (resultByObjectId.matchedCount > 0)
                        return res.send(resultByObjectId);
                }
                catch (e) { }
            }
            res.send(result);
        });
        // Delete campaign
        app.delete('/campaigns/:id', async (req, res) => {
            const id = req.params.id;
            const result = await campaigns.deleteOne({ id: id });
            if (result.deletedCount === 0) {
                try {
                    const resultByObjectId = await campaigns.deleteOne({ _id: new mongodb_1.ObjectId(id) });
                    if (resultByObjectId.deletedCount > 0)
                        return res.send(resultByObjectId);
                }
                catch (e) { }
            }
            res.send(result);
        });
    }
    finally {
        // await client.close()
    }
}
run().catch(console.dir);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

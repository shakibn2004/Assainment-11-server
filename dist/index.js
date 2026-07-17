"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const mongodb_1 = require("mongodb");
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
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const sessions = db.collection('session');
        console.log(`verifyToken: Searching for token exactly: "${token}"`);
        const session = await sessions.findOne({ token: token });
        if (!session) {
            console.log('verifyToken: Session not found for token:', token);
            return res.status(401).json({ message: "Unauthorized: Invalid session" });
        }
        if (new Date(session.expiresAt) < new Date()) {
            console.log('verifyToken: Session expired at', session.expiresAt);
            return res.status(401).json({ message: "Unauthorized: Session expired" });
        }
        req.user = { userId: session.userId };
        next();
    }
    catch (error) {
        console.log('error', error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
const db = client.db("Assainment-11");
const campaigns = db.collection('campaigns');
const users = db.collection('user'); // BetterAuth default user collection
const isAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            console.log('isAdmin: No userId found in req.user');
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await users.findOne({ _id: userId });
        if (!user) {
            console.log('isAdmin: User not found for id:', userId);
            return res.status(403).json({ message: "Forbidden: User not found" });
        }
        if (user.role?.toLowerCase() !== 'admin') {
            console.log('isAdmin: User is not admin. Role:', user.role);
            return res.status(403).json({ message: "Forbidden: Admin access required" });
        }
        next();
    }
    catch (e) {
        console.log('isAdmin error:', e);
        return res.status(500).json({ message: "Internal server error" });
    }
};
// --- USERS API (Admin Only) ---
app.get('/users', async (req, res) => {
    const result = await users.find({}).toArray();
    // map _id to id for frontend
    const mapped = result.map(u => ({ ...u, id: u._id }));
    res.send(mapped);
});
app.patch('/users/:id', async (req, res) => {
    const id = req.params.id;
    const { role, status } = req.body;
    const updateData = {};
    if (role)
        updateData.role = role;
    if (status)
        updateData.status = status;
    const result = await users.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: updateData });
    res.send(result);
});
app.delete('/users/:id', async (req, res) => {
    const id = req.params.id;
    const result = await users.deleteOne({ _id: new mongodb_1.ObjectId(id) });
    res.send(result);
});
// Test route to verify DB connection and token querying
app.get('/test-session/:token', async (req, res) => {
    try {
        const t = req.params.token;
        const session = await db.collection('session').findOne({ token: t });
        res.json({ found: !!session, session });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// --- CAMPAIGNS API ---
// Get all campaigns or filter by featured/status/creator
app.get('/campaigns', async (req, res) => {
    const query = {};
    if (req.query.featured === 'true') {
        query.featured = true;
    }
    if (req.query.creatorId) {
        query.creatorId = req.query.creatorId;
    }
    if (req.query.status) {
        query.status = req.query.status;
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
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
module.exports = app;

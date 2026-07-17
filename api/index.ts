import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose-cjs";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not defined");
}

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// (Removed unused JWKS initialization)

export interface AuthenticatedRequest extends Request {
    user?: any; // You can type this more strictly based on your JWT payload
}

const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
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
    } catch (error) {
        console.log('error', error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const db = client.db("Assainment-11");
const campaigns = db.collection('campaigns');
const users = db.collection('user'); // BetterAuth default user collection

const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
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
    } catch (e) {
        console.log('isAdmin error:', e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// --- USERS API (Admin Only) ---

app.get('/users', async (req: Request, res: Response) => {
    const result = await users.find({}).toArray();
    // map _id to id for frontend
    const mapped = result.map(u => ({ ...u, id: u._id }));
    res.send(mapped);
});

app.patch('/users/:id', async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    const { role, status } = req.body;
    
    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const result = await users.updateOne(
        { _id: new ObjectId(id as string) },
        { $set: updateData }
    );
    res.send(result);
});

app.delete('/users/:id', async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    const result = await users.deleteOne({ _id: new ObjectId(id as string) });
    res.send(result);
});

// Test route to verify DB connection and token querying
app.get('/test-session/:token', async (req: Request, res: Response) => {
    try {
        const t = req.params.token;
        const session = await db.collection('session').findOne({ token: t });
        res.json({ found: !!session, session });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- CAMPAIGNS API ---

// Get all campaigns or filter by featured/status/creator
app.get('/campaigns', async (req: Request, res: Response) => {
            const query: any = {};
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
        app.get('/campaigns/:id', async (req: Request, res: Response): Promise<any> => {
            const id = req.params.id;
            const result = await campaigns.findOne({ id: id });
            if (!result) {
                // Try with ObjectId just in case
                try {
                    const resultByObjectId = await campaigns.findOne({ _id: new ObjectId(id as string) });
                    if (resultByObjectId) return res.send(resultByObjectId);
                } catch (e) {}
                return res.status(404).send({ message: "Campaign not found" });
            }
            res.send(result);
        });
        
        // Create campaign
        app.post('/campaigns', async (req: Request, res: Response) => {
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
        app.patch('/campaigns/:id', async (req: Request, res: Response): Promise<any> => {
            const id = req.params.id;
            const updatedData = req.body;
            delete updatedData._id; // prevent modifying _id
            
            const result = await campaigns.updateOne(
                { id: id },
                { $set: updatedData }
            );
            
            if (result.matchedCount === 0) {
                 // Try with ObjectId
                 try {
                     const resultByObjectId = await campaigns.updateOne(
                         { _id: new ObjectId(id as string) },
                         { $set: updatedData }
                     );
                     if (resultByObjectId.matchedCount > 0) return res.send(resultByObjectId);
                 } catch (e) {}
            }
            res.send(result);
        });

        // Delete campaign
        app.delete('/campaigns/:id', async (req: Request, res: Response): Promise<any> => {
            const id = req.params.id;
            const result = await campaigns.deleteOne({ id: id });
            if (result.deletedCount === 0) {
                try {
                    const resultByObjectId = await campaigns.deleteOne({ _id: new ObjectId(id as string) });
                    if (resultByObjectId.deletedCount > 0) return res.send(resultByObjectId);
                } catch (e) {}
            }
            res.send(result);
        });



if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;

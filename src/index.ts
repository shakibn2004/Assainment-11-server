import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

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

// verify token middleware
const jwksUrl = process.env.CLIENT_URI ? `${process.env.CLIENT_URI}/api/auth/jwks` : 'http://localhost:3000/api/auth/jwks';
const JWKS = createRemoteJWKSet(new URL(jwksUrl));

export interface AuthenticatedRequest extends Request {
    user?: any; // You can type this more strictly based on your JWT payload
}

const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;
        next();
    } catch (error) {
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
        app.get('/campaigns', async (req: Request, res: Response) => {
            const query: any = {};
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

    } finally {
        // await client.close()
    }
}

run().catch(console.dir);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

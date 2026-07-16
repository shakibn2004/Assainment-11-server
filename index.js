const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");


const app = express();

app.use(cors());
app.use(express.json());
// database and collection create and send data
async function run() {
    
}

run().catch(console.dir);

app.listen(8000, () => {
    console.log(`Server running on port 8000`);
});
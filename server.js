require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
const API_TOKEN = process.env.API_TOKEN;
const DB_NAME = process.env.DB_NAME || "preos";

if (!MONGODB_URI || !API_TOKEN) {
  console.error("Missing MONGODB_URI or API_TOKEN");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

async function db() {
  await client.connect();
  return client.db(DB_NAME);
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();
  if (token !== API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// List visitors
app.get("/visitors", requireAuth, async (req, res) => {
  try {
    const database = await db();
    const visitors = await database.collection("visitors").find().sort({ createdAt: -1 }).toArray();
    res.json({ visitors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Create visitor
app.post("/visitors", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const visitor = {
      name: body.name || "",
      phone: body.phone || "",
      interest: body.interest || "",
      source: body.source || "Walk-in",
      language: body.language || "Telugu",
      routedTo: body.routedTo || "",
      status: body.status || "New",
      notes: body.notes || "",
      createdAt: new Date(),
    };
    const database = await db();
    const result = await database.collection("visitors").insertOne(visitor);
    res.json({ id: result.insertedId.toString(), visitor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PREOS API running on port ${PORT}`);
});

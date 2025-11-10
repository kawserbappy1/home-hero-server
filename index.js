const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.rmpdbzj.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("hero-home");
    const porductCollection = db.collection("herohomecollection");

    // get top rated data from database
    app.get("/tr-services", async (req, res) => {
      const result = await porductCollection
        .find()
        .sort({ serviceReview: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // get all service and by category
    app.get("/services", async (req, res) => {
      const category = req.query.category;
      const query = category ? { category } : {};
      const result = await porductCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const { id } = req.params;
      const objectedId = new ObjectId(id);
      const result = await porductCollection.findOne({ _id: objectedId });
      res.send({
        success: true,
        result,
      });
    });

    // Add service to db
    app.post("/services", async (req, res) => {
      const data = req.body;
      const result = await porductCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running successfully");
});

app.listen(port, () => {
  console.log(`This server is running from port no ${port}`);
});

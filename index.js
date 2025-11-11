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
    const bookingColooection = db.collection("bookings");

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

    // get service details
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

    // fetch emailed service to ui
    app.get("/my-services", async (req, res) => {
      const email = req.query.email;
      const result = await porductCollection
        .find({ provideremail: email })
        .toArray();
      res.send(result);
    });

    // update service
    app.put("/services/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const objectId = { _id: new ObjectId(id) };
      const update = {
        $set: data,
      };
      const result = await porductCollection.updateOne(objectId, update);
      res.send(result);
    });

    //  Delete service from db
    app.delete("/services/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = { _id: new ObjectId(id) };
      const result = await porductCollection.deleteOne(objectId);
      res.send(result);
    });

    // store booking data
    app.post("/booking", async (req, res) => {
      const data = req.body;
      const result = await bookingColooection.insertOne(data);
      res.send(result);
    });

    // get bookings by user email
    app.get("/booking", async (req, res) => {
      const email = req.query.email;
      const result = await bookingColooection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });
    // Update booking status
    app.patch("/booking/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;

        // Validate the status
        if (
          !status ||
          !["pending", "confirmed", "cancelled"].includes(status)
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid status value",
          });
        }

        const result = await bookingColooection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: status } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Booking not found",
          });
        }

        res.json({
          success: true,
          message: "Booking status updated successfully",
        });
      } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({
          success: false,
          error: "Failed to update booking status",
        });
      }
    });
    // Delete a booking
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingColooection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
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

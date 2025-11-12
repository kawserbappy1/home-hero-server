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

    // Add review to service

    app.post("/reviews", async (req, res) => {
      try {
        const reviewData = req.body;

        // Validate required fields
        if (
          !reviewData.serviceId ||
          !reviewData.userEmail ||
          !reviewData.rating ||
          !reviewData.comment
        ) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields",
          });
        }

        const review = {
          ...reviewData,
          rating: Number(reviewData.rating),
          reviewDate: new Date().toISOString(),
          userName: reviewData.userName || "Anonymous",
          verified: true,
        };

        // Insert the review
        const result = await db.collection("reviews").insertOne(review);

        // 🔹 Recalculate the average rating and review count for the service
        const allReviews = await db
          .collection("reviews")
          .find({ serviceId: reviewData.serviceId })
          .toArray();

        const totalRatings = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRatings / allReviews.length;

        // 🔹 Update the service document in your herohomecollection
        await db.collection("herohomecollection").updateOne(
          { _id: new ObjectId(reviewData.serviceId) },
          {
            $set: {
              serviceReview: avgRating.toFixed(1),
              reviewCount: allReviews.length,
            },
          }
        );

        res.json({
          success: true,
          message: "Review submitted successfully",
          reviewId: result.insertedId,
          newAverage: avgRating.toFixed(1),
          reviewCount: allReviews.length,
        });
      } catch (error) {
        console.error("Error submitting review:", error);
        res.status(500).json({
          success: false,
          error: "Failed to submit review",
        });
      }
    });

    // Get reviews for a specific service
    app.get("/reviews/:serviceId", async (req, res) => {
      try {
        const { serviceId } = req.params;

        const reviews = await db
          .collection("reviews")
          .find({ serviceId: serviceId })
          .sort({ reviewDate: -1 })
          .toArray();

        res.json({
          success: true,
          data: reviews,
        });
      } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch reviews",
        });
      }
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

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.mjs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

const PORT = process.env.PORT;

const mongooseConn = mongoose;

const DB_URI = process.env.MONGO_URI;
console.log(DB_URI);

mongooseConn
  .connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Successfully connected to MongoDB"))
  .catch((err) => console.error("Connection error:", err));

app.post("/api/waitlist", async (request, response) => {
  try {
    const newUser = new User(request.body);

    const savedUser = await newUser.save();

    response.status(201).json(savedUser);
  } catch (err) {
    response
      .status(400)
      .json({ message: "Error saving user", error: err.message });
  }
});

app.get("/api/waitlist/count", async (request, response) => {
  try {
    const count = await User.countDocuments();
    response.status(200).json({ count: count });
  } catch (err) {
    response
      .status(500)
      .json({ message: "Error getting count", error: err.message });
  }
});

app.get("/", (request, response) => {
  return response.send("Akira's API is live and running!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

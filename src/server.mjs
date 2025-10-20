import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import routes from "./routes/index.mjs";
import session from "express-session";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:3000", // your frontend
    credentials: true, // allow cookies
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    rolling: true,
    cookie: {
      maxAge: 6 * 60 * 60 * 1000,
    },
  })
);
app.use(routes);

const PORT = process.env.PORT;

const mongooseConn = mongoose;

const DB_URI = process.env.MONGO_URI;
console.log(DB_URI);

// mongooseConn
//   .connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log("Successfully connected to MongoDB"))
//   .catch((err) => console.error("Connection error:", err));

app.get("/", (request, response) => {
  return response.send("Akira's API is live and running!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

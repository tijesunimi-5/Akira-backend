import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// Assuming you have these files in your project:
import routes from "./routes/index.mjs";
import { initializeWebSocket } from "../utils/helpers/webSocketHelper.mjs";

dotenv.config();

// 1. Initialize Express App
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORS Configuration ---
const ALLOWED_ORIGINS = [
  "http://localhost:3000", // Akira Dashboard (Frontend)
  "http://127.0.0.1:5500", // Your VS Code Live Server/dummy site
  "http://localhost:5500",
];

// Configure CORS for Express routes (HTTP POST requests)
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g., curl, mobile apps)
      if (!origin) return callback(null, true);

      // Check if the origin is in our allowed list
      if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
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

// Mount all your existing Express routes
// This MUST include mounting eventRoutes under /api/v1 inside routes/index.mjs
app.use(routes);

const PORT = process.env.PORT || 8000; // Use 8000 as default if not in .env

// ----------------------------------------------------
// ⚡ WEB SOCKET INTEGRATION
// ----------------------------------------------------

// 2. Create the Node HTTP Server and attach the Express app to it
const httpServer = createServer(app);

// 3. Initialize Socket.IO Server
const io = new SocketIOServer(httpServer, {
  // Crucial: Configure CORS specifically for Socket.IO connections (WS requests)
  cors: {
    origin: ALLOWED_ORIGINS, // Use the shared allowed origins list
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 4. Initialize the WebSocket Helper with the 'io' instance
initializeWebSocket(io);

// 5. Handle Socket.IO Connections and Store Registration
io.on("connection", (socket) => {
  console.log(`Socket.IO client connected: ${socket.id}`);

  socket.on("registerStore", ({ storeId, snippetToken }) => {
    // Validation logic would go here.
    if (storeId) {
      socket.join(`store_${storeId}`);
      console.log(`Socket ${socket.id} joined store room: store_${storeId}`);
      socket.data.storeId = storeId;
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket.IO client disconnected: ${socket.id}`);
  });
});

// ----------------------------------------------------

// Default Express route
app.get("/", (request, response) => {
  return response.send("Akira's API is live and running!");
});

// 6. Listen on the HTTP server, not the Express app
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket Server is also running.`);
});

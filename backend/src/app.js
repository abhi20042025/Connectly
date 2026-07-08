import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);

// Initialize Socket.IO
connectToSocket(server);

// Middleware
// Configured CORS to explicitly accept incoming browser requests from local UI setups
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173"], // Covers both standard React and Vite dev ports
    credentials: true
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ extended: true, limit: "40kb" }));

// Test Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running"
    });
});

// User Routes
app.use("/api/v1/users", userRoutes);

// Port
const PORT = process.env.PORT || 8000;

// Database Connection & Server Start
const start = async () => {
    try {
        const fallbackUri = "mongodb://singhabhi965133_db_user:Astalavista1006@ac-hjfulv7-shard-00-00.de23vbd.mongodb.net:27017/your_database_name?ssl=true&authSource=admin";
        const mongoUri = process.env.MONGO_URI || fallbackUri;

        const connectionDb = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${connectionDb.connection.host}`);
    } catch (error) {
        console.error("MongoDB Connection Error (Graceful Start):", error.message);
        console.log("Proceeding to start server without Database connection...");
    }

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

start();
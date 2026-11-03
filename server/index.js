import env from "./config/env.config.js";

import http from "http";
import mongoose from "mongoose";
import connectDB from "./config/db.config.js";

import app from "./app.js";

const PORT = env.PORT || 5000;

const server = http.createServer(app);


// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`\n[SERVER] ${signal} received. Shutting down...`);

    server.close(async () => {
        await mongoose.connection.close();
        console.log("[SERVER] Shutdown complete");
        process.exit(0);
    });

    setTimeout(() => {
        console.error("[SERVER] Forced shutdown");
        process.exit(1);
    }, 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

try {
    await connectDB();

    server.listen(PORT, () => {
        console.log(`[SERVER] Server is running on port ${PORT}`);
    });
} catch (error) {
    console.error("[SERVER] Failed to start server:", error);
    process.exit(1);
}


import express from "express";
import env from "./config/env.config.js";
import cors from "cors";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/user.route.js";
import projectRoutes from "./routes/project.route.js";
import deploymentRoutes from "./routes/deployment.route.js";

import {ApiResponse} from "./utils/api-response.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Deplow API is running"
  });
});

// API Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/deployments", deploymentRoutes);

// 404 Handler
app.use((req, res) => {
  return res.status(404).json(
    new ApiResponse(404, null, "Route not found")
  );
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error("[ERROR]", err);

  return res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      null,
      err.message || "Internal server error"
    )
  );
});

export default app;
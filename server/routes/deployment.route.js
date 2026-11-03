
import express from "express";

import {
  deploy,
  getDeploymentStatus
} from "../controllers/deployment.controller.js";

import {isAuthenticated} from "../middlewares/auth.middleware.js";
import asyncHandler from "../utils/async-handler.js";

const router = express.Router();

// router.use(isAuthenticated);

router.post(
  "/:projectId/deploy",
  asyncHandler(deploy)
);

router.get(
  "/:projectId/status",
  asyncHandler(getDeploymentStatus)
);

export default router;

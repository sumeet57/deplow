
import express from "express";

import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject
} from "../controllers/project.controller.js";

import {isAuthenticated} from "../middlewares/auth.middleware.js";
import { validateCreateProject } from "../middlewares/validate.middleware.js";
import asyncHandler from "../utils/async-handler.js";

const router = express.Router();

// router.use(isAuthenticated);
// Create project
router.post("/" ,asyncHandler(createProject));

// Get all projects
router.get("/", asyncHandler(getProjects));

// Get single project
router.get("/:id", asyncHandler(getProject));

// Update project configuration
router.patch("/:id", asyncHandler(updateProject));

// Delete project
router.delete("/:id", asyncHandler(deleteProject));

export default router;

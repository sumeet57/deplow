
import mongoose from "mongoose";
import Project from "../models/project.model.js";
import { deployProject } from "../services/deployment.service.js";

export const deploy = async (req, res) => {
  const { projectId } = req.params;

  // Validate project ID
  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID."
    });
  }

  // Get authenticated user
  const userId =  "6ae9bf5a4e78eb4ac5c5dc64";

  // Check project ownership
  const project = await Project.findOne({
    _id: projectId,
    // userId
  }).select("deployment.status");

  console.log("Project found:", project);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found."
    });
  }

  // Prevent duplicate deployment
  if (project.deployment.status === "deploying") {
    return res.status(409).json({
      success: false,
      message: "A deployment is already in progress."
    });
  }

  // Execute deployment
  const result = await deployProject(projectId, userId);
  console.log("Deployment result:", result);

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: "Deployment failed.",
      error: result.message
    });
  }

  return res.status(200).json({
    success: true,
    message: "Deployment completed successfully.",
    data: {
      commit: result.commit
    }
  });
};


// Get deployment status
export const getDeploymentStatus = async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID."
    });
  }

  const userId = req.user.id || req.user._id;

  const project = await Project.findOne({
    _id: projectId,
    userId
  }).select("deployment");

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found."
    });
  }

  return res.status(200).json({
    success: true,
    data: project.deployment
  });
};

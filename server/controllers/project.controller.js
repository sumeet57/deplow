
import mongoose from "mongoose";
import * as projectService from "../services/project.service.js";
import { encrypt } from "../utils/encryption.js";

const getUserId = (req) => "6ae8f04c0cff76ede061e091"; // Default user ID for testing


const validateProject = (data, isUpdate = false) => {
  const errors = [];

  const allowedFields = [
    "name",
    "description",
    "repositoryUrl",
    "branch",
    "rootDirectory",
    "runtime",
    "server",
    "configuration"
  ];

  // Validate top-level fields
  for (const key of Object.keys(data)) {
    if (!allowedFields.includes(key)) {
      errors.push(`Field '${key}' is not allowed.`);
    }
  }

  // Required fields during creation
  if (!isUpdate) {
    for (const field of [
      "name",
      "repositoryUrl",
      "server"
    ]) {
      if (!data[field]) {
        errors.push(`${field} is required.`);
      }
    }
  }

  // Project name
  if (data.name !== undefined) {
    if (
      typeof data.name !== "string" ||
      data.name.trim().length < 2 ||
      data.name.trim().length > 50
    ) {
      errors.push("Project name must be between 2 and 50 characters.");
    }
  }

  // Description
  if (data.description !== undefined) {
    if (
      typeof data.description !== "string" ||
      data.description.length > 250
    ) {
      errors.push("Description must not exceed 250 characters.");
    }
  }

  // GitHub repository URL
  if (data.repositoryUrl !== undefined) {
    try {
      const url = new URL(data.repositoryUrl);

      if (
        url.protocol !== "https:" ||
        url.hostname !== "github.com" ||
        url.username ||
        url.password ||
        !/^\/[^/]+\/[^/]+\/?$/.test(url.pathname)
      ) {
        errors.push("Provide a valid public GitHub repository URL.");
      }
    } catch {
      errors.push("Invalid repository URL.");
    }
  }

  // Branch
  if (data.branch !== undefined) {
    if (
      typeof data.branch !== "string" ||
      !data.branch.trim() ||
      data.branch.length > 128
    ) {
      errors.push("Invalid Git branch.");
    }
  }

  // Root directory
  if (data.rootDirectory !== undefined) {
    if (
      typeof data.rootDirectory !== "string" ||
      data.rootDirectory.startsWith("/") ||
      data.rootDirectory.split("/").includes("..")
    ) {
      errors.push("Invalid project root directory.");
    }
  }

  // Runtime
  if (
    data.runtime !== undefined &&
    data.runtime !== "nodejs"
  ) {
    errors.push("Only Node.js runtime is currently supported.");
  }

  // Server configuration
  if (data.server !== undefined) {
    const server = data.server;

    if (!server || typeof server !== "object" || Array.isArray(server)) {
      errors.push("Invalid server configuration.");
    } else {
      const allowedServerFields = [
        "host",
        "port",
        "username",
        "privateKey",
        "hostFingerprint"
      ];

      for (const key of Object.keys(server)) {
        if (!allowedServerFields.includes(key)) {
          errors.push(`Server field '${key}' is not allowed.`);
        }
      }

      if (server.host !== undefined) {
        if (
          typeof server.host !== "string" ||
          !server.host.trim() ||
          server.host.length > 253
        ) {
          errors.push("Invalid server host.");
        }
      }

      if (server.username !== undefined) {
        if (
          typeof server.username !== "string" ||
          !/^[a-z_][a-z0-9_-]{0,31}$/.test(server.username)
        ) {
          errors.push("Invalid SSH username.");
        }
      }

      if (
        server.port !== undefined &&
        (!Number.isInteger(server.port) ||
          server.port < 1 ||
          server.port > 65535)
      ) {
        errors.push("SSH port must be between 1 and 65535.");
      }

      if (server.privateKey !== undefined) {
        if (
          typeof server.privateKey !== "string" ||
          !server.privateKey.includes("PRIVATE KEY")
        ) {
          errors.push("Invalid SSH private key.");
        }
      }

      if (server.hostFingerprint !== undefined) {
        if (
          typeof server.hostFingerprint !== "string" ||
          !/^SHA256:[A-Za-z0-9+/]+$/.test(server.hostFingerprint)
        ) {
          errors.push("Invalid SSH host fingerprint.");
        }
      }
    }
  }

  // Node.js configuration
  if (data.configuration !== undefined) {
    const config = data.configuration;

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      errors.push("Invalid project configuration.");
    } else {
      const allowedConfigFields = [
        "nodeVersion",
        "packageManager",
        "installCommand",
        "buildCommand",
        "startCommand",
        "port",
        "deploymentPath",
        "processName",
        "environmentVariables"
      ];

      for (const key of Object.keys(config)) {
        if (!allowedConfigFields.includes(key)) {
          errors.push(`Configuration field '${key}' is not allowed.`);
        }
      }

      if (
        config.nodeVersion !== undefined &&
        !["18", "20", "22", "24"].includes(config.nodeVersion)
      ) {
        errors.push("Unsupported Node.js version.");
      }

      if (
        config.packageManager !== undefined &&
        !["npm", "pnpm", "yarn"].includes(config.packageManager)
      ) {
        errors.push("Unsupported package manager.");
      }

      for (const key of [
        "installCommand",
        "buildCommand",
        "startCommand"
      ]) {
        if (
          config[key] !== undefined &&
          (
            typeof config[key] !== "string" ||
            config[key].length > 200 ||
            /[\0\r\n]/.test(config[key])
          )
        ) {
          errors.push(`Invalid ${key}.`);
        }
      }

      if (
        config.port !== undefined &&
        (!Number.isInteger(config.port) ||
          config.port < 1 ||
          config.port > 65535)
      ) {
        errors.push("Application port must be between 1 and 65535.");
      }

      if (config.deploymentPath !== undefined) {
        if (
          typeof config.deploymentPath !== "string" ||
          !config.deploymentPath.startsWith("/") ||
          config.deploymentPath.includes("..") ||
          config.deploymentPath.length > 200
        ) {
          errors.push("Invalid deployment path.");
        }
      }

      if (config.processName !== undefined) {
        if (
          typeof config.processName !== "string" ||
          !/^[a-zA-Z0-9_-]{1,50}$/.test(config.processName)
        ) {
          errors.push("Invalid PM2 process name.");
        }
      }

      if (config.environmentVariables !== undefined) {
        const env = config.environmentVariables;

        if (
          !env ||
          typeof env !== "object" ||
          Array.isArray(env)
        ) {
          errors.push("Invalid environment variables.");
        } else {
          for (const [key, value] of Object.entries(env)) {
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
              errors.push(`Invalid environment variable name: ${key}`);
            }

            if (
              typeof value !== "string" ||
              value.length > 10000
            ) {
              errors.push(`Invalid environment variable value: ${key}`);
            }
          }
        }
      }
    }
  }

  return errors;
};


export const createProject = async (req, res) => {

  const errors = validateProject(req.body);
  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Invalid project configuration.",
      errors
    });
  }
  const  {server, ...projectData} = req.body;

 if (!server?.privateKey) {
    return res.status(400).json({
      success: false,
      message: "SSH private key is required"
    });
  }

  const encryptedPrivateKey = encrypt(server.privateKey);

  const project = await projectService.createProject("6ae8f04c0cff76ede061e091", {
    ...projectData,
    server: {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      encryptedPrivateKey
    }
  });


  return res.status(201).json({
    success: true,
    message: "Project created successfully.",
    data: project
  });
};

export const getProjects = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

  const result = await projectService.getProjects(
    getUserId(req),
    page,
    limit
  );

  return res.status(200).json({
    success: true,
    message: "Projects fetched successfully.",
    data: result
  });
};

export const getProject = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID."
    });
  }

  const project = await projectService.getProjectById(
    getUserId(req),
    req.params.id
  );

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found."
    });
  }

  return res.status(200).json({
    success: true,
    data: project
  });
};

export const updateProject = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID."
    });
  }

  const errors = validateProject(req.body, true);

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Invalid project configuration.",
      errors
    });
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No fields provided for update."
    });
  }

  const project = await projectService.updateProject(
    getUserId(req),
    req.params.id,
    req.body
  );

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found."
    });
  }

  return res.status(200).json({
    success: true,
    message: "Project updated successfully.",
    data: project
  });
};

export const deleteProject = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID."
    });
  }

  const project = await projectService.deleteProject(
    getUserId(req),
    req.params.id
  );

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found."
    });
  }

  return res.status(200).json({
    success: true,
    message: "Project deleted successfully."
  });
};


import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },

    description: {
      type: String,
      trim: true,
      maxlength: 250,
      default: ""
    },

    // GitHub configuration
    repositoryUrl: {
      type: String,
      required: true,
      trim: true
    },

    branch: {
      type: String,
      required: true,
      trim: true,
      default: "main"
    },

    rootDirectory: {
      type: String,
      trim: true,
      default: "."
    },

    runtime: {
      type: String,
      enum: ["nodejs"],
      default: "nodejs",
      required: true
    },

    // Customer VPS configuration
    server: {
  host: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    default: 22,
    min: 1,
    max: 65535
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  encryptedPrivateKey: {
    type: String,
    required: true,
    select: false
  },
  hostFingerprint: {
    type: String,
    default: null
  },
  sshVerifiedAt: {
    type: Date,
    default: null
  }
},
    // Node.js configuration
    configuration: {
      nodeVersion: {
        type: String,
        enum: ["18", "20", "22", "24"],
        default: "22"
      },

      packageManager: {
        type: String,
        enum: ["npm", "pnpm", "yarn"],
        default: "npm"
      },

      installCommand: {
        type: String,
        default: "npm ci",
        maxlength: 200
      },

      buildCommand: {
        type: String,
        default: "",
        maxlength: 200
      },

      startCommand: {
        type: String,
        default: "npm start",
        maxlength: 200
      },

      port: {
        type: Number,
        min: 1,
        max: 65535,
        default: 3000
      },

      deploymentPath: {
        type: String,
        default: "/var/www/deplow"
      },

      processName: {
        type: String,
        trim: true,
        maxlength: 50
      },

      environmentVariables: {
        type: Map,
        of: String,
        default: {}
      }
    },

    // Deployment information
    deployment: {
      lastDeployedCommit: {
        type: String,
        default: null
      },

      lastDeployedAt: {
        type: Date,
        default: null
      },

      status: {
        type: String,
        enum: [
          "never-deployed",
          "queued",
          "deploying",
          "success",
          "failed"
        ],
        default: "never-deployed"
      },

      lastError: {
        type: String,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

projectSchema.index({ userId: 1, createdAt: -1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;

import Joi from "joi";

export const createProjectSchema = Joi.object({
    userId: Joi.string().hex().length(24).required().messages({
        "string.hex": "User ID must be a valid MongoDB ObjectId.",
        "string.length": "User ID must be a valid MongoDB ObjectId.",
        "any.required": "User ID is required.",
        "string.empty": "User ID is required."
    }),

    name: Joi.string().trim().min(2).max(50).required().messages({
        "string.min": "Project name must be at least 2 characters.",
        "string.max": "Project name must be at most 50 characters.",
        "any.required": "Project name is required.",
        "string.empty": "Project name is required."
    }),

    description: Joi.string().trim().max(250).allow("").default("").messages({
        "string.max": "Project description must be at most 250 characters."
    }),

    repositoryUrl: Joi.string().trim().uri().required().messages({
        "string.uri": "Repository URL must be a valid URL.",
        "any.required": "Repository URL is required.",
        "string.empty": "Repository URL is required."
    }),

    branch: Joi.string().trim().required().default("main").messages({
        "any.required": "Branch is required.",
        "string.empty": "Branch is required."
    }),

    rootDirectory: Joi.string().trim().default(".").messages({
        "string.base": "Root directory must be a string."
    }),

    runtime: Joi.string().valid("nodejs").required().default("nodejs").messages({
        "any.only": "Runtime must be nodejs.",
        "any.required": "Runtime is required."
    }),

    server: Joi.object({
        host: Joi.string().trim().required().messages({
            "any.required": "Server host is required.",
            "string.empty": "Server host is required."
        }),
        port: Joi.number().integer().min(1).max(65535).default(22).messages({
            "number.base": "Server port must be a number.",
            "number.integer": "Server port must be an integer.",
            "number.min": "Server port must be at least 1.",
            "number.max": "Server port must be at most 65535."
        }),
        username: Joi.string().trim().required().messages({
            "any.required": "Server username is required.",
            "string.empty": "Server username is required."
        }),
        encryptedPrivateKey: Joi.string().required().messages({
            "any.required": "Encrypted private key is required.",
            "string.empty": "Encrypted private key is required."
        }),
        hostFingerprint: Joi.string().trim().required().messages({
            "any.required": "Host fingerprint is required.",
            "string.empty": "Host fingerprint is required."
        })
    }).required().messages({
        "any.required": "Server configuration is required."
    }),

    configuration: Joi.object({
        nodeVersion: Joi.string().valid("18", "20", "22", "24").default("22").messages({
            "any.only": "Node version must be 18, 20, 22, or 24."
        }),
        packageManager: Joi.string().valid("npm", "pnpm", "yarn").default("npm").messages({
            "any.only": "Package manager must be npm, pnpm, or yarn."
        }),
        installCommand: Joi.string().max(200).default("npm ci").messages({
            "string.max": "Install command must be at most 200 characters."
        }),
        buildCommand: Joi.string().max(200).default("").messages({
            "string.max": "Build command must be at most 200 characters."
        }),
        startCommand: Joi.string().max(200).default("npm start").messages({
            "string.max": "Start command must be at most 200 characters."
        }),
        port: Joi.number().integer().min(1).max(65535).default(3000).messages({
            "number.base": "Application port must be a number.",
            "number.integer": "Application port must be an integer.",
            "number.min": "Application port must be at least 1.",
            "number.max": "Application port must be at most 65535."
        }),
        deploymentPath: Joi.string().default("/var/www/deplow").messages({
            "string.base": "Deployment path must be a string."
        }),
        processName: Joi.string().trim().max(50).messages({
            "string.max": "Process name must be at most 50 characters."
        }),
        environmentVariables: Joi.object().pattern(Joi.string(), Joi.string()).default({}).messages({
            "object.base": "Environment variables must be an object.",
            "string.base": "Environment variable values must be strings."
        })
    }).default({}).messages({
        "object.base": "Node.js configuration must be an object."
    }),

    deployment: Joi.object({
        lastDeployedCommit: Joi.string().allow(null).default(null),
        lastDeployedAt: Joi.date().allow(null).default(null).messages({
            "date.base": "Last deployed date must be a valid date."
        }),
        status: Joi.string().valid("never-deployed", "queued", "deploying", "success", "failed")
            .default("never-deployed")
            .messages({
                "any.only": "Deployment status is invalid."
            }),
        lastError: Joi.string().allow(null).default(null)
    }).default({}).messages({
        "object.base": "Deployment information must be an object."
    }),
}).messages({
    "object.unknown": "Unknown project field is not allowed."
});
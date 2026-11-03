
import Project from "../models/project.model.js";
import { decrypt } from "../utils/encryption.js";
import { connectSSH, executeSSH } from "../utils/ssh.js";

const quote = (value) => {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
};

const validateConfig = (project) => {
    const { configuration, server } = project;

    if (!server?.hostFingerprint) {
        throw new Error("Server SSH fingerprint is not configured.");
    }

    if (!configuration?.deploymentPath?.startsWith("/")) {
        throw new Error("Deployment path must be absolute.");
    }

    if (configuration.deploymentPath.includes("..")) {
        throw new Error("Invalid deployment path.");
    }

    if (
        project.rootDirectory.startsWith("/") ||
        project.rootDirectory.split("/").includes("..")
    ) {
        throw new Error("Invalid project root directory.");
    }

    for (const command of [
        configuration.installCommand,
        configuration.buildCommand,
        configuration.startCommand
    ]) {
        if (
            typeof command !== "string" ||
            command.length > 200 ||
            /[\0\r\n]/.test(command)
        ) {
            throw new Error("Invalid deployment command.");
        }
    }
};

export const deployProject = async (
    projectId,
    userId,
    onLog = () => { }
) => {
    let sshClient;
    let project;
    let deployedCommit = null;

    const log = (message, type = "info") => {
        onLog({
            type,
            message,
            timestamp: new Date()
        });
    };

    try {
        // 1. Fetch project and SSH credentials
        project = await Project.findOne({
            _id: projectId,
            // userId
        }).select("+server.encryptedPrivateKey");

        if (!project) {
            throw new Error("Project not found.");
        }

        if (project.deployment.status === "deploying") {
            throw new Error("Project is already deploying.");
        }

        validateConfig(project);

        // 2. Mark deployment as running
        project.deployment.status = "deploying";
        project.deployment.lastError = null;

        await project.save();

        const {
            server,
            configuration
        } = project;

        const privateKey = decrypt(
            server.encryptedPrivateKey
        );

        log("Connecting to customer VPS...");

        // 3. Establish SSH connection
        if (!project.server.hostFingerprint || !project.server.sshVerifiedAt) {
            throw new Error("SSH host fingerprint verification required");
        }
        sshClient = await connectSSH(server, privateKey);

        log("SSH connection established.", "success");

        const execute = async (command, label) => {
            log(label);

            const result = await executeSSH(
                sshClient,
                command,
                (output) => onLog(output)
            );

            return result;
        };

        const deploymentPath = configuration.deploymentPath;
        const appRoot = [
            deploymentPath,
            project.rootDirectory === "."
                ? ""
                : project.rootDirectory
        ].filter(Boolean).join("/");

        const branch = project.branch;
        const repo = project.repositoryUrl;
        const processName =
            configuration.processName ||
            project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

        // 4. Validate remote environment
        log("Checking remote environment...");

        const nodeCheck = await executeSSH(
            "node -v && git --version && npm --version",
            () => { }
        );

        const nodeMajor = nodeCheck.stdout.match(/v(\d+)/)?.[1];

        if (nodeMajor !== configuration.nodeVersion) {
            throw new Error(
                `Expected Node.js ${configuration.nodeVersion}, found ${nodeCheck.stdout.trim()}. Install the configured Node.js version on your VPS.`
            );
        }

        // 5. Check PM2
        await executeSSH(
            "command -v pm2 >/dev/null 2>&1 || npm install -g pm2",
            () => { }
        );

        // 6. Clone or update repository
        log("Fetching latest GitHub repository...");

        const cloneCommand = `
      mkdir -p ${quote(deploymentPath)} &&
      if [ -d ${quote(deploymentPath + "/.git")} ]; then
        git -C ${quote(deploymentPath)} fetch origin ${quote(branch)} &&
        git -C ${quote(deploymentPath)} checkout ${quote(branch)} &&
        git -C ${quote(deploymentPath)} reset --hard FETCH_HEAD;
      else
        git clone --depth 1 --branch ${quote(branch)}
        ${quote(repo)} ${quote(deploymentPath)};
      fi
    `;

        await execute(cloneCommand, "Repository fetched.");

        // 7. Resolve exact deployed commit
        const commitResult = await executeSSH(
            `git -C ${quote(deploymentPath)} rev-parse HEAD`,
            () => { }
        );

        deployedCommit = commitResult.stdout.trim();

        log(`Latest commit: ${deployedCommit}`, "success");

        // 8. Enter project root
        const rootCommand = `cd ${quote(appRoot)} && `;

        // 9. Install dependencies
        await execute(
            rootCommand + configuration.installCommand,
            "Installing dependencies..."
        );

        // 10. Build application
        if (configuration.buildCommand?.trim()) {
            await execute(
                rootCommand + configuration.buildCommand,
                "Building application..."
            );
        }

        // 11. Prepare environment variables
        const environmentVariables =
            configuration.environmentVariables || {};

        const envEntries = Object.entries(
            environmentVariables instanceof Map
                ? Object.fromEntries(environmentVariables)
                : environmentVariables
        );

        for (const [key, value] of envEntries) {
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
                throw new Error(`Invalid environment variable name: ${key}`);
            }
        }

        const envContent = envEntries
            .map(([key, value]) => `${key}=${String(value)}`)
            .join("\n");

        const envBase64 = Buffer.from(envContent).toString("base64");

        await executeSSH(
            `printf '%s' ${quote(envBase64)} | base64 -d > ${quote(appRoot + "/.env")} && chmod 600 ${quote(appRoot + "/.env")}`,
            () => { }
        );

        // 12. Restart application with PM2
        const startScript = `
      cd ${quote(appRoot)} &&
      set -a &&
      source .env &&
      set +a &&
      exec ${configuration.startCommand}
    `;

        const startCommand = `
      pm2 delete ${quote(processName)} >/dev/null 2>&1 || true
      pm2 start bash --name ${quote(processName)} -- -lc ${quote(startScript)}
      pm2 save
    `;

        await execute(startCommand, "Starting application with PM2...");

        // 13. Verify PM2 process
        await executeSSH(
            `pm2 describe ${quote(processName)}`,
            () => { }
        );

        // 14. Save deployment information
        project.deployment.status = "success";
        project.deployment.lastDeployedCommit = deployedCommit;
        project.deployment.lastDeployedAt = new Date();
        project.deployment.lastError = null;

        await project.save();

        log("Deployment completed successfully!", "success");

        return {
            success: true,
            commit: deployedCommit,
            message: "Deployment successful."
        };

    } catch (error) {
        log(error.message, "error");

        if (project) {
            project.deployment.status = "failed";
            project.deployment.lastError = error.message;

            await project.save().catch(() => { });
        }

        return {
            success: false,
            commit: deployedCommit,
            message: error.message
        };

    } finally {
        // 15. Always close SSH connection
        if (sshClient) {
            sshClient.end();
            log("SSH connection closed.");
        }
    }
};

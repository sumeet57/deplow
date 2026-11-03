
import { Client } from "ssh2";

export const connectSSH = (server, privateKey) => {
  return new Promise((resolve, reject) => {
    const client = new Client();

    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        client.end();
        reject(new Error("SSH connection timed out."));
      }
    }, 15000);

    client.on("ready", () => {
      if (settled) return;

      settled = true;
      clearTimeout(timeout);
      resolve(client);
    });

    client.on("error", (error) => {
      if (settled) return;

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    client.connect({
      host: server.host,
      port: server.port,
      username: server.username,
      privateKey,

      readyTimeout: 15000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 2,

      hostHash: "sha256",

      // Only connect to a previously trusted host.
      hostVerifier: (keyHash) => {
        const fingerprint =
          "SHA256:" +
          keyHash.toString("base64").replace(/=+$/, "");

        return fingerprint === server.hostFingerprint;
      }
    });
  });
};

export const executeSSH = (
  client,
  command,
  onLog = () => {}
) => {
  return new Promise((resolve, reject) => {
    client.exec(command, (error, stream) => {
      if (error) return reject(error);

      let stdout = "";
      let stderr = "";

      const maxOutput = 1024 * 1024;

      stream.on("data", (data) => {
        const chunk = data.toString();

        stdout += chunk;

        onLog({
          type: "stdout",
          message: chunk
        });
      });

      stream.stderr.on("data", (data) => {
        const chunk = data.toString();

        stderr += chunk;

        onLog({
          type: "stderr",
          message: chunk
        });
      });

      stream.on("close", (code) => {
        if (stdout.length + stderr.length > maxOutput) {
          return reject(
            new Error("Deployment output exceeded the limit.")
          );
        }

        if (code !== 0) {
          return reject(
            new Error(
              stderr.trim() ||
              stdout.trim() ||
              `Remote command failed with exit code ${code}`
            )
          );
        }

        resolve({
          code,
          stdout,
          stderr
        });
      });

      stream.on("error", reject);
    });
  });
};

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import open from "open";
import { getConfig } from "./config.js";

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_API_URL = "https://codeusage.dev";

interface CallbackData {
  workspace_key: string;
  workspace_name: string;
}

export interface BrowserAuthResult {
  success: boolean;
  workspaceKey?: string;
  workspaceName?: string;
  error?: string;
}

/**
 * Find an available port by starting a server on port 0
 */
async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Could not find available port")));
      }
    });
    server.on("error", reject);
  });
}

/**
 * Start a local HTTP server to receive the callback from the browser
 */
function startCallbackServer(
  port: number
): Promise<{ server: ReturnType<typeof createServer>; waitForCallback: () => Promise<CallbackData> }> {
  return new Promise((resolve, reject) => {
    let callbackResolve: (data: CallbackData) => void;
    let callbackReject: (error: Error) => void;

    const callbackPromise = new Promise<CallbackData>((res, rej) => {
      callbackResolve = res;
      callbackReject = rej;
    });

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      // Enable CORS for localhost
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      // Handle preflight
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Only accept POST to /callback
      if (req.method !== "POST" || req.url !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          const data = JSON.parse(body) as CallbackData;

          if (!data.workspace_key || !data.workspace_name) {
            res.writeHead(400);
            res.end("Invalid callback data");
            return;
          }

          // Send success response
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));

          // Resolve the callback promise
          callbackResolve(data);
        } catch {
          res.writeHead(400);
          res.end("Invalid JSON");
        }
      });
    });

    server.listen(port, () => {
      resolve({
        server,
        waitForCallback: () => callbackPromise,
      });
    });

    server.on("error", (err) => {
      reject(err);
    });

    // Set timeout for callback
    setTimeout(() => {
      callbackReject(new Error("Timeout waiting for browser authentication"));
    }, CALLBACK_TIMEOUT_MS);
  });
}

/**
 * Get the base API URL from env var, config, or use default
 */
function getApiUrl(): string {
  // Check env var first (useful for development)
  // Use dynamic access to prevent bun from inlining at build time
  const envUrl = process["env"]["CODEUSAGE_API_URL"];
  if (envUrl) {
    return envUrl;
  }
  const config = getConfig();
  return config.api_url || DEFAULT_API_URL;
}

/**
 * Perform browser-based authentication
 * 1. Start a local callback server
 * 2. Open browser to the connect page
 * 3. Wait for callback with workspace credentials
 */
export async function browserAuth(): Promise<BrowserAuthResult> {
  try {
    // Find an available port
    const port = await findAvailablePort();

    // Start callback server
    const { server, waitForCallback } = await startCallbackServer(port);

    // Calculate expiry timestamp (5 minutes from now)
    const expiresAt = Math.floor((Date.now() + CALLBACK_TIMEOUT_MS) / 1000);

    // Build connect URL
    const baseUrl = getApiUrl();
    const connectUrl = `${baseUrl}/cli/connect?port=${port}&expires=${expiresAt}`;

    // Open browser
    await open(connectUrl);

    // Wait for callback
    const data = await waitForCallback();

    // Small delay to ensure response is sent before closing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Close the server
    server.close();

    return {
      success: true,
      workspaceKey: data.workspace_key,
      workspaceName: data.workspace_name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Browser authentication failed",
    };
  }
}

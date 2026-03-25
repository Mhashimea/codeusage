import type { TelemetryPayload } from "@codeusage/shared";
import { getConfig } from "./config.js";

const DEFAULT_API_URL = "https://codeusage.dev";

function getApiBase(): string {
  // Priority: env var > config > default
  if (process.env.CODEUSAGE_API_URL) {
    return process.env.CODEUSAGE_API_URL;
  }
  const config = getConfig();
  return config.api_url || DEFAULT_API_URL;
}

export interface ApiResult {
  success: boolean;
  task_id?: string;
  error?: string;
  retryAfter?: number;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
}

export async function sendTask(payload: TelemetryPayload): Promise<ApiResult> {
  const config = getConfig();

  if (!config.workspace_key) {
    return {
      success: false,
      error: "No workspace key configured. Run: codeusage init",
    };
  }

  try {
    const response = await fetch(`${getApiBase()}/api/v1/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.workspace_key}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      const data = (await response.json()) as { task_id: string };
      return { success: true, task_id: data.task_id };
    }

    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get("Retry-After") || "60",
        10
      );
      return { success: false, error: "Rate limited", retryAfter };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: "Invalid workspace key. Run: codeusage init",
      };
    }

    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    return {
      success: false,
      error: errorData.error || `API error: ${response.status}`,
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
}

export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; workspace?: WorkspaceInfo; error?: string }> {
  const apiUrl = `${getApiBase()}/api/v1/auth/validate`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 200) {
      const data = (await response.json()) as { workspace_id: string; workspace_name: string };
      return {
        valid: true,
        workspace: {
          id: data.workspace_id,
          name: data.workspace_name,
        },
      };
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API key" };
    }

    const errorBody = await response.text().catch(() => "");
    return { valid: false, error: `Unexpected response ${response.status} from ${apiUrl}: ${errorBody}` };
  } catch (err) {
    const error = err as Error;
    const cause = error.cause ? ` (cause: ${JSON.stringify(error.cause)})` : "";
    return {
      valid: false,
      error: `Network error connecting to ${apiUrl}: ${error.message}${cause}`,
    };
  }
}

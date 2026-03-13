/**
 * Afterburn Cloud Integration
 * Handles API key validation and session upload to cloud
 */

const DEFAULT_API_URL = 'https://afterburn.dev';

export interface CloudConfig {
  apiKey?: string;
  apiUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  error?: string;
}

export interface SessionUploadData {
  projectName: string;
  projectSlug?: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  branch?: string;
  commitHash?: string;
  author?: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  commitsCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  model?: string;
  actionsCount: number;
  actionsJson?: unknown;
  aiSummary?: string;
  aiType?: string;
  reportMarkdown: string;
}

export interface UploadResult {
  success: boolean;
  sessionId?: string;
  projectId?: string;
  error?: string;
}

/**
 * Get API key from environment or config
 */
export function getApiKey(configApiKey?: string): string | undefined {
  // Priority: CLI flag > env var > config file
  return configApiKey || process.env.AFTERBURN_API_KEY;
}

/**
 * Get API URL from environment or config
 */
export function getApiUrl(configApiUrl?: string): string {
  return configApiUrl || process.env.AFTERBURN_API_URL || DEFAULT_API_URL;
}

/**
 * Validate API key with the cloud server
 */
export async function validateApiKey(
  apiKey: string,
  apiUrl: string = DEFAULT_API_URL
): Promise<ValidationResult> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json() as {
      valid?: boolean;
      organization?: ValidationResult['organization'];
      error?: string;
    };

    if (!response.ok) {
      return {
        valid: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      valid: data.valid ?? false,
      organization: data.organization,
      error: data.error,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Upload a session report to the cloud
 */
export async function uploadSession(
  apiKey: string,
  data: SessionUploadData,
  apiUrl: string = DEFAULT_API_URL
): Promise<UploadResult> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectName: data.projectName,
        projectSlug: data.projectSlug,
        startedAt: data.startedAt.toISOString(),
        endedAt: data.endedAt?.toISOString(),
        durationSeconds: data.durationSeconds,
        branch: data.branch,
        commitHash: data.commitHash,
        author: data.author,
        filesChanged: data.filesChanged,
        linesAdded: data.linesAdded,
        linesRemoved: data.linesRemoved,
        commitsCount: data.commitsCount,
        totalTokens: data.totalTokens,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cacheReadTokens: data.cacheReadTokens,
        estimatedCost: data.estimatedCost,
        model: data.model,
        actionsCount: data.actionsCount,
        actionsJson: data.actionsJson,
        aiSummary: data.aiSummary,
        aiType: data.aiType,
        reportMarkdown: data.reportMarkdown,
      }),
    });

    const result = await response.json() as {
      sessionId?: string;
      projectId?: string;
      error?: string;
    };

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      sessionId: result.sessionId,
      projectId: result.projectId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check if cloud mode is enabled
 */
export function isCloudEnabled(config?: { cloud?: { enabled?: boolean } }): boolean {
  // Cloud is enabled if API key is set OR config explicitly enables it
  const hasApiKey = !!getApiKey();
  const configEnabled = config?.cloud?.enabled;

  return hasApiKey || configEnabled === true;
}

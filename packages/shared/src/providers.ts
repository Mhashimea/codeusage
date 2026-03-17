/**
 * Provider registry for AI coding tools
 * This is the single source of truth for supported providers
 */

/**
 * Provider status
 */
export type ProviderStatus = "active" | "coming_soon" | "beta";

/**
 * Provider identifier
 */
export type ProviderId = "claude_code" | "codex";

/**
 * Provider information
 */
export interface ProviderInfo {
  id: ProviderId;
  name: string;
  displayName: string;
  status: ProviderStatus;
  description: string;
  /** Pattern for session log location (provider-specific) */
  sessionLogPath?: string;
  /** Whether this provider supports hook-based integration */
  hooksSupported: boolean;
}

/**
 * Provider registry - all supported AI coding tools
 */
export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  claude_code: {
    id: "claude_code",
    name: "Claude Code",
    displayName: "Claude Code",
    status: "active",
    description: "Anthropic's AI coding assistant",
    sessionLogPath: "~/.claude/projects/{hash}/sessions/*.jsonl",
    hooksSupported: true,
  },
  codex: {
    id: "codex",
    name: "Codex",
    displayName: "OpenAI Codex",
    status: "coming_soon",
    description: "OpenAI's code generation model",
    hooksSupported: false,
  },
};

/**
 * Get all providers (regardless of status)
 */
export function getAllProviders(): ProviderInfo[] {
  return Object.values(PROVIDERS);
}

/**
 * Get only active providers (available for use)
 */
export function getActiveProviders(): ProviderInfo[] {
  return Object.values(PROVIDERS).filter((p) => p.status === "active");
}

/**
 * Get providers that are coming soon
 */
export function getComingSoonProviders(): ProviderInfo[] {
  return Object.values(PROVIDERS).filter((p) => p.status === "coming_soon");
}

/**
 * Get provider by ID
 */
export function getProviderById(id: string): ProviderInfo | undefined {
  return PROVIDERS[id as ProviderId];
}

/**
 * Check if a provider is active
 */
export function isProviderActive(id: string): boolean {
  const provider = getProviderById(id);
  return provider?.status === "active";
}

/**
 * Check if a provider ID is valid
 */
export function isValidProviderId(id: string): id is ProviderId {
  return id in PROVIDERS;
}

/**
 * Default provider for new installations
 */
export const DEFAULT_PROVIDER: ProviderId = "claude_code";

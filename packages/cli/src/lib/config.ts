import Conf from "conf";
import type { AfterBurnConfig, ToolSource } from "@afterburn/shared";
import { DEFAULT_PROVIDER } from "@afterburn/shared";

const config = new Conf<AfterBurnConfig>({
  projectName: "afterburn",
  defaults: {
    workspace_key: "",
    developer_alias: "",
    provider: DEFAULT_PROVIDER,
    hook_scope: "global",
    default_project: "",
    project_overrides: {},
  },
});

export function getConfig(): AfterBurnConfig {
  return config.store;
}

export function getConfigValue<K extends keyof AfterBurnConfig>(
  key: K
): AfterBurnConfig[K] {
  return config.get(key);
}

export function setConfig<K extends keyof AfterBurnConfig>(
  key: K,
  value: AfterBurnConfig[K]
): void {
  config.set(key, value);
}

export function setFullConfig(newConfig: Partial<AfterBurnConfig>): void {
  for (const [key, value] of Object.entries(newConfig)) {
    config.set(key as keyof AfterBurnConfig, value);
  }
}

export function clearConfig(): void {
  config.clear();
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return Boolean(cfg.workspace_key && cfg.developer_alias);
}

export function getConfigPath(): string {
  return config.path;
}

/**
 * Get provider with fallback for legacy configs
 * Migrates old configs that don't have provider field
 */
export function getProvider(): ToolSource {
  const provider = config.get("provider");
  if (!provider) {
    // Migrate legacy config: default to claude_code
    config.set("provider", DEFAULT_PROVIDER);
    return DEFAULT_PROVIDER;
  }
  return provider;
}

/**
 * Set the active provider
 */
export function setProvider(provider: ToolSource): void {
  config.set("provider", provider);
}

/**
 * Get all enabled providers
 * Returns array of providers, migrating legacy single-provider configs
 */
export function getProviders(): ToolSource[] {
  const providers = config.get("providers");
  if (providers && providers.length > 0) {
    return providers;
  }
  // Migrate from legacy single provider config
  const singleProvider = getProvider();
  return [singleProvider];
}

/**
 * Add a provider to the enabled list
 */
export function addProvider(provider: ToolSource): void {
  const current = getProviders();
  if (!current.includes(provider)) {
    const updated = [...current, provider];
    config.set("providers", updated);
  }
}

/**
 * Remove a provider from the enabled list
 */
export function removeProvider(provider: ToolSource): void {
  const current = getProviders();
  const updated = current.filter((p) => p !== provider);
  if (updated.length === 0) {
    throw new Error("Cannot remove the last provider. At least one provider must be enabled.");
  }
  config.set("providers", updated);
  // If we removed the primary provider, set a new one
  if (config.get("provider") === provider) {
    config.set("provider", updated[0]);
  }
}

/**
 * Check if a provider is enabled
 */
export function hasProvider(provider: ToolSource): boolean {
  return getProviders().includes(provider);
}

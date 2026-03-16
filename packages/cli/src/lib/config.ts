import Conf from "conf";
import type { AfterBurnConfig } from "@afterburn/shared";

const config = new Conf<AfterBurnConfig>({
  projectName: "afterburn",
  defaults: {
    workspace_key: "",
    developer_alias: "",
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

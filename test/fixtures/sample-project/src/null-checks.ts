// AB005: Null Checks - this file should trigger null/undefined issues

interface Config {
  settings?: {
    theme?: string;
    notifications?: boolean;
  };
}

// Should trigger: Optional chaining could be used
export function getTheme(config: Config) {
  if (config && config.settings && config.settings.theme) {
    return config.settings.theme;
  }
  return 'default';
}

// Should trigger: for...of on potentially null array
export function processItems(items?: string[]) {
  for (const item of items) {
    console.log(item);
  }
}

// Should trigger: Accessing property on possibly undefined
export function getUserEmail(user: { email?: string }) {
  return user.email.toLowerCase();
}

// Should trigger: Array method on possibly undefined
export function filterActive(users?: any[]) {
  return users.filter(u => u.active);
}

// Should trigger: Spread on possibly undefined
export function mergeConfig(base: Config, override?: Config) {
  return { ...base, ...override.settings };
}

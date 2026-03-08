// AB006: Hardcoded Config - this file should trigger config issues

// Should trigger: Hardcoded URL
const API_URL = "https://api.production.mycompany.com/v1";

// Should trigger: Hardcoded port
const SERVER_PORT = 3000;

// Should trigger: Hardcoded timeout
const REQUEST_TIMEOUT = 30000;

// Should trigger: Hardcoded IP address
const DATABASE_HOST = "192.168.1.100";

export function createClient() {
  return {
    baseUrl: API_URL,
    port: SERVER_PORT,
    timeout: REQUEST_TIMEOUT,
    dbHost: DATABASE_HOST,
  };
}

// Should trigger: Hardcoded feature flag
const ENABLE_NEW_FEATURE = true;

// Should trigger: Hardcoded pagination
export function fetchUsers(page: number) {
  const limit = 50;
  return fetch(`${API_URL}/users?page=${page}&limit=${limit}`);
}

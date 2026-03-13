// Test fixture for AB006: Hardcoded Configuration Values Rule
// This file intentionally contains hardcoded config values

// Hardcoded URLs - should be detected
const apiBaseUrl = 'http://localhost:3000/api';
const prodApiUrl = 'https://api.mycompany.com/v1';
const serviceEndpoint = 'http://192.168.1.100:8080/service';

// Hardcoded ports - should be detected
const serverPort = 3000;
const dbPort = 5432;
const redisPort = 6379;
const appListenPort = ':8080';

// Hardcoded IPs - should be detected
const databaseHost = '192.168.1.50';
const localHost = '127.0.0.1';
const bindAddress = '0.0.0.0';
const privateIp = '10.0.0.1';

// Hardcoded absolute paths - should be detected
const logPath = '/var/log/myapp/app.log';
const configPath = '/etc/myapp/config.json';
const dataPath = '/home/user/data/files';
const windowsPath = 'C:\\Users\\admin\\Documents\\config.txt';

// Configuration object with hardcoded values
const config = {
  server: {
    host: 'localhost',
    port: 3000,
  },
  database: {
    host: '192.168.1.100',
    port: 5432,
    connectionString: 'postgres://localhost:5432/mydb',
  },
  api: {
    baseUrl: 'https://api.production.com',
    timeout: 5000,
  },
};

// Good patterns that should NOT be detected (using env vars)
const goodApiUrl = process.env.API_URL || 'http://localhost:3000';
const goodPort = parseInt(process.env.PORT || '3000', 10);
const goodDbHost = process.env.DB_HOST;

// Config from external file (good pattern)
import { config as externalConfig } from './config';
const { apiUrl, port } = externalConfig;

export {
  apiBaseUrl,
  prodApiUrl,
  serverPort,
  databaseHost,
  config,
};

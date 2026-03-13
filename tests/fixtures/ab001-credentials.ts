// Test fixture for AB001: Hardcoded Credentials Rule
// This file intentionally contains hardcoded credentials for testing

// API Keys that should be detected
const apiKey = 'sk-1234567890abcdefghijklmnopqrstuv';
const stripeKey = 'pk_live_abcdefghijklmnopqrstuvwxyz123456';
const githubToken = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const awsAccessKey = 'AKIAIOSFODNN7EXAMPLE';

// Password assignments that should be detected
const password = "mysecretpassword123";
const pwd = 'admin123';
const secret = "topsecret";
const dbToken = `database_token_value`;

// Connection strings with credentials
const mongoUri = 'mongodb://user:password123@localhost:27017/mydb';
const postgresUrl = 'postgres://admin:secretpwd@db.example.com:5432/production';
const mysqlConn = 'mysql://root:rootpassword@127.0.0.1:3306/app';

// AWS patterns
const awsSecretKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

// Should NOT trigger (false positives to avoid)
const envPassword = process.env.PASSWORD;
const configuredSecret = process.env.SECRET_KEY;
const placeholder = 'sk-your-api-key-here';
const exampleToken = 'pk_test_example_for_docs';

export {
  apiKey,
  stripeKey,
  githubToken,
  awsAccessKey,
  password,
  mongoUri,
};

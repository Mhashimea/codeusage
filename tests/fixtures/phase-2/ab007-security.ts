// Test fixture for AB007: Security Anti-Patterns
// This file intentionally contains security vulnerabilities for testing

import crypto from 'crypto';

// MD5 for password hashing - should be detected (CRITICAL)
function hashPassword(password: string) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// SHA1 usage - should be detected
function hashDataSha1(data: string) {
  return crypto.createHash('sha1').update(data).digest('hex');
}

// Math.random for security - should be detected (CRITICAL)
function generateToken() {
  return Math.random().toString(36).substring(2) + 'token';
}

// SQL injection via string concatenation - should be detected (CRITICAL)
function getUserByName(name: string, db: any) {
  return db.query("SELECT * FROM users WHERE name = '" + name + "'");
}

// SQL injection via template literal - should be detected (CRITICAL)
async function getUserById(id: string, db: any) {
  return db.execute(`SELECT * FROM users WHERE id = ${id}`);
}

// eval() usage - should be detected (CRITICAL)
function executeCode(code: string) {
  return eval(code);
}

// new Function() usage - should be detected (CRITICAL)
function createFunction(body: string) {
  return new Function('a', 'b', body);
}

// innerHTML assignment - should be detected
function setContent(element: HTMLElement, content: string) {
  element.innerHTML = content;
}

// document.write - should be detected
function writeToDocument(html: string) {
  document.write(html);
}

// JWT without expiration - should be detected (CRITICAL)
function createToken(payload: any, jwt: any) {
  return jwt.sign(payload, 'secret');
}

// JWT hardcoded secret - should be detected (CRITICAL)
function verifyToken(token: string, jwt: any) {
  return jwt.verify(token, 'my-super-secret-key-12345');
}

// jwt.decode without verify - should be detected
function decodeToken(token: string, jwt: any) {
  return jwt.decode(token);
}

// CORS allow all origins - should be detected (CRITICAL)
const corsConfig = {
  origin: '*',
  credentials: true,
};

// Disabled SSL verification - should be detected (CRITICAL)
const httpsOptions = {
  rejectUnauthorized: false,
};

// Logging sensitive data - should be detected (CRITICAL)
function logAuth(password: string) {
  console.log('User password:', password);
}

// Command injection - should be detected (CRITICAL)
function runCommand(userInput: string, exec: any) {
  exec(`ls -la ${userInput}`);
}

// Password string comparison - should be detected
function checkPassword(input: string, stored: string) {
  return input === stored; // Timing attack vulnerable
}

// Good patterns that should NOT be detected
function secureHash(password: string, bcrypt: any) {
  return bcrypt.hash(password, 10);
}

function secureRandom() {
  return crypto.randomBytes(32).toString('hex');
}

function safeQuery(name: string, db: any) {
  return db.query('SELECT * FROM users WHERE name = ?', [name]);
}

export { hashPassword, getUserByName, createToken, corsConfig };

// AB007: Security - this file should trigger security issues

import { exec } from 'child_process';

// Should trigger: Command injection risk
export function runCommand(userInput: string) {
  exec(`ls ${userInput}`);
}

// Should trigger: eval usage
export function evaluateExpression(expr: string) {
  return eval(expr);
}

// Should trigger: innerHTML assignment
export function renderContent(content: string) {
  document.getElementById('app').innerHTML = content;
}

// Should trigger: Regex DoS risk
const emailRegex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;

// Should trigger: SQL-like string concatenation
export function findUser(username: string) {
  const query = "SELECT * FROM users WHERE name = '" + username + "'";
  return query;
}

// Should trigger: Hardcoded CORS origin
export const corsConfig = {
  origin: '*',
  credentials: true,
};

// Should trigger: Prototype pollution risk
export function merge(target: any, source: any) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}

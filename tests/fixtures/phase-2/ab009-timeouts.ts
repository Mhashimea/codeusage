// Test fixture for AB009: Missing Timeout Configuration
// This file intentionally contains patterns without timeouts for testing

// fetch() without AbortController - should be detected
async function fetchData(url: string) {
  const response = await fetch(url);
  return response.json();
}

// fetch() with dynamic URL - should be detected
async function fetchUser(userId: string) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// axios without timeout - should be detected
async function axiosGet(url: string) {
  const axios = require('axios');
  return axios.get(url);
}

// axios.post without timeout - should be detected
async function axiosPost(url: string, data: any) {
  const axios = require('axios');
  return axios.post(url, data, { headers: { 'Content-Type': 'application/json' } });
}

// axios.create without timeout - should be detected
function createAxiosClient() {
  const axios = require('axios');
  return axios.create({ baseURL: '/api' });
}

// MongoDB find without limit - should be detected
async function findAllUsers(db: any) {
  return db.collection('users').find({ active: true });
}

// SQL SELECT without LIMIT - should be detected
function getUsersQuery() {
  return "SELECT * FROM users WHERE active = true";
}

// Prisma findMany without take - should be detected
async function getAllPosts(prisma: any) {
  return prisma.post.findMany({ where: { published: true } });
}

// Database connection without timeout - should be detected
function connectToDb() {
  const mysql = require('mysql');
  return mysql.createConnection({ host: 'localhost', user: 'root' });
}

// setInterval without clearInterval reference - should be detected
function startPolling() {
  setInterval(() => {
    console.log('polling...');
  }, 1000);
}

// setTimeout in loop - should be detected
function delayedProcessing(items: any[]) {
  for (const item of items) {
    setTimeout(() => {
      console.log(item);
    }, 100);
  }
}

// WebSocket without heartbeat - should be detected
function connectWebSocket() {
  const ws = new WebSocket('ws://localhost:8080');
  ws.onmessage = (event) => {
    console.log(event.data);
  };
}

// HTTP server without timeout - should be detected
function createServer() {
  const http = require('http');
  return http.createServer((req: any, res: any) => {
    res.end('Hello');
  });
}

// Express app without timeout middleware - should be detected
function createExpressApp() {
  const express = require('express');
  const app = express();
  app.get('/', (req: any, res: any) => res.send('Hello'));
  return app;
}

// Promise without timeout - should be detected
function longRunningTask() {
  return new Promise((resolve) => {
    // Some long-running operation
    setTimeout(resolve, 10000);
  });
}

// Stream piping without timeout - should be detected
function processStream(input: any, output: any) {
  input.pipe(output);
}

// Good patterns that should NOT be detected
async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function axiosWithTimeout(url: string) {
  const axios = require('axios');
  return axios.get(url, { timeout: 30000 });
}

function startPollingWithCleanup() {
  const intervalId = setInterval(() => {
    console.log('polling...');
  }, 1000);
  return () => clearInterval(intervalId);
}

export { fetchData, axiosGet, startPolling, connectWebSocket };

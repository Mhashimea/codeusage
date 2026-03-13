// Test fixture for AB004: Duplicate Logic Detection
// This file intentionally contains duplicate patterns for testing

// Magic numbers repeated 3+ times - should be detected
const timeout1 = 12500;
const timeout2 = 12500;
const timeout3 = 12500;
const timeout4 = 12500;

// More magic numbers
const retryCount1 = 7777;
const retryCount2 = 7777;
const retryCount3 = 7777;

// Repeated string literals - should be detected
const errorMsg1 = 'Connection failed. Please try again.';
const errorMsg2 = 'Connection failed. Please try again.';
const errorMsg3 = 'Connection failed. Please try again.';

// Similar code blocks - should be detected
function processUser1(user: any) {
  const validated = validate(user);
  const normalized = normalize(validated);
  return save(normalized);
}

function processUser2(user: any) {
  const validated = validate(user);
  const normalized = normalize(validated);
  return save(normalized);
}

// Repeated try-catch patterns - should be detected
async function fetchData1() {
  try {
    const response = await fetch('/api/data1');
    return response.json();
  } catch (e) {
    console.error(e);
  }
}

async function fetchData2() {
  try {
    const response = await fetch('/api/data2');
    return response.json();
  } catch (e) {
    console.error(e);
  }
}

async function fetchData3() {
  try {
    const response = await fetch('/api/data3');
    return response.json();
  } catch (e) {
    console.error(e);
  }
}

async function fetchData4() {
  try {
    const response = await fetch('/api/data4');
    return response.json();
  } catch (e) {
    console.error(e);
  }
}

// Repeated conditions - should be detected
function checkStatus(status: string) {
  if (status === 'pending' && user.isActive) {
    doSomething1();
  }
}

function checkStatus2(status: string) {
  if (status === 'pending' && user.isActive) {
    doSomething2();
  }
}

function checkStatus3(status: string) {
  if (status === 'pending' && user.isActive) {
    doSomething3();
  }
}

// Good patterns that should NOT be detected
const TIMEOUT_MS = 30000; // Named constant
const ERROR_MESSAGE = 'An error occurred'; // Single definition

// Helper declarations
declare function validate(data: any): any;
declare function normalize(data: any): any;
declare function save(data: any): any;
declare const user: { isActive: boolean };
declare function doSomething1(): void;
declare function doSomething2(): void;
declare function doSomething3(): void;

export { timeout1, errorMsg1, processUser1, fetchData1 };

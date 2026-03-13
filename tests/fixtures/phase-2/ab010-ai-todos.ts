// Test fixture for AB010: AI TODO/FIXME Detection
// This file intentionally contains incomplete implementation markers for testing

// TODO comments - should be detected
// TODO: Implement user authentication
function login(username: string, password: string) {
  // TODO implement this
  return true;
}

// FIXME comments - should be detected
// FIXME: This breaks on edge cases
function calculateTotal(items: any[]) {
  // FIXME race condition here
  return items.reduce((sum, item) => sum + item.price, 0);
}

// HACK comments - should be detected
// HACK: Temporary workaround for API bug
function fetchData() {
  // HACK this needs proper fix
  return {};
}

// XXX comments - should be detected
// XXX: Review this logic
function processOrder(order: any) {
  return order;
}

/* TODO: block comment style */
function blockTodo() {}

/* FIXME: block comment fixme */
function blockFixme() {}

// AI placeholder - "implement this" - should be detected
function createUser(data: any) {
  // implement this function
  return data;
}

// AI placeholder - "add logic here" - should be detected
function validateInput(input: any) {
  // add your logic here
  return true;
}

// AI placeholder - "put your code here" - should be detected
function handleEvent(event: any) {
  // put your code here
}

// AI continuation marker - "..." - should be detected
function processItems(items: any[]) {
  // ... rest of implementation
  return items;
}

// Bare continuation marker - should be detected
function incompleteFunction() {
  // ...
}

// AI placeholder - "fill in" - should be detected
function completeMe() {
  // fill in the implementation
}

// AI placeholder - "complete this" - should be detected
function finishThis() {
  // complete this function
}

// throw "Not implemented" - should be detected (CRITICAL)
function notImplementedYet() {
  throw new Error("Not implemented");
}

// throw TODO error - should be detected (CRITICAL)
function todoError() {
  throw new Error("TODO");
}

// console.log TODO - should be detected
function withConsoleTodo() {
  console.log("TODO: fix this");
  return 1;
}

// Stub function returning null - should be detected
const stubFunction = () => null;

// Empty return body - should be detected
function emptyReturn() {
  return;
}

// Good patterns that should NOT be detected
function properlyImplemented(data: any) {
  if (!data) {
    throw new Error('Data is required');
  }
  return { processed: true, data };
}

function fullyComplete() {
  const result = calculateSomething();
  return result;
}

function calculateSomething() {
  return 42;
}

export {
  login,
  calculateTotal,
  fetchData,
  notImplementedYet,
  properlyImplemented,
};

// AB009: Timeouts - this file should trigger timeout/async issues

// Should trigger: Fetch without timeout
export async function fetchDataNoTimeout() {
  const response = await fetch('/api/data');
  return response.json();
}

// Should trigger: Promise without timeout
export function waitForEvent() {
  return new Promise((resolve) => {
    document.addEventListener('custom-event', resolve);
  });
}

// Should trigger: setInterval without cleanup
export function startPolling() {
  setInterval(() => {
    console.log('polling...');
  }, 1000);
}

// Should trigger: setTimeout in async function without await
export async function delayedOperation() {
  setTimeout(() => {
    console.log('delayed');
  }, 5000);
}

// Should trigger: Long timeout value
export function veryLongTimeout() {
  setTimeout(() => {
    console.log('finally!');
  }, 3600000); // 1 hour
}

// Should trigger: Recursive setTimeout without base case
function recursivePoll() {
  setTimeout(() => {
    fetch('/api/status');
    recursivePoll();
  }, 1000);
}

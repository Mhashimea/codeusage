// Test fixture for AB002: Generic Error Swallowing Rule
// This file intentionally contains bad error handling patterns

// Empty catch block - should be detected
async function badErrorHandling1() {
  try {
    await fetch('/api/data');
  } catch (e) {}
}

// Console-only catch - should be detected
async function badErrorHandling2() {
  try {
    await fetch('/api/data');
  } catch (e) {
    console.log(e);
  }
}

// Ignored error parameter - should be detected
async function badErrorHandling3() {
  try {
    await fetch('/api/data');
  } catch (_) {
    // Do nothing
  }
}

async function badErrorHandling4() {
  try {
    await fetch('/api/data');
  } catch (ignored) {
    return null;
  }
}

// Promise without catch - should be detected
function badPromiseHandling() {
  fetch('/api/data').then(response => response.json());

  someAsyncFunction()
    .then(data => processData(data));
}

// Good patterns that should NOT be detected
async function goodErrorHandling1() {
  try {
    await fetch('/api/data');
  } catch (e) {
    // Intentionally swallowing error for graceful degradation
    return defaultValue;
  }
}

async function goodErrorHandling2() {
  try {
    await fetch('/api/data');
  } catch (e) {
    logger.error('Failed to fetch data', { error: e });
    throw new AppError('Data fetch failed', e);
  }
}

function goodPromiseHandling() {
  fetch('/api/data')
    .then(response => response.json())
    .catch(error => handleError(error));
}

export {
  badErrorHandling1,
  badErrorHandling2,
  badErrorHandling3,
  goodErrorHandling1,
};

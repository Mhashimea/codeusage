// Test fixture for AB003: Optimistic Type Assertions Rule
// This file intentionally contains problematic type assertions

interface User {
  id: number;
  name: string;
  email: string;
}

interface AdminUser extends User {
  role: 'admin';
  permissions: string[];
}

// `as any` type assertion - should be detected
const data = fetchData() as any;
const result = (someValue as any).property;

// Non-null assertions - should be detected
const user = getUser();
const userName = user!.name;
const nestedValue = obj!.nested!.deep!.value;

// Double casting with unknown - should be detected
const adminUser = userData as unknown as AdminUser;
const forcedCast = input as unknown as OutputType;

// @ts-ignore comment - should be detected
// @ts-ignore
const ignoredError = invalidCode.property;

// @ts-expect-error - should be detected
// @ts-expect-error - this will fail
const expectedError = anotherInvalidCode.method();

// @ts-nocheck - should be detected (if at file level)
// Note: This comment doesn't have effect mid-file but should still be flagged

// Good patterns that should NOT be detected (with proper type guards)
function processUser(data: unknown): User | null {
  if (typeof data === 'object' && data !== null) {
    if ('id' in data && 'name' in data && 'email' in data) {
      return data as User; // Safe after type guard
    }
  }
  return null;
}

// Type assertion with validation
function assertIsUser(value: unknown): asserts value is User {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Not an object');
  }
  if (!('id' in value) || !('name' in value)) {
    throw new Error('Missing required fields');
  }
}

export { data, user, adminUser };

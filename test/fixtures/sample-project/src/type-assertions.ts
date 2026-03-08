// AB003: Type Assertions - this file should trigger type assertion issues

interface User {
  id: number;
  name: string;
  email: string;
}

// Should trigger: any type usage
export function processData(data: any) {
  return data.value;
}

// Should trigger: Type assertion
export function getUser(response: unknown): User {
  return response as User;
}

// Should trigger: Non-null assertion
export function getUserName(user: User | null): string {
  return user!.name;
}

// Should trigger: @ts-ignore
// @ts-ignore
export function unsafeOperation(x) {
  return x.someProperty;
}

// Should trigger: as any
export function castToAny(value: unknown) {
  return (value as any).doSomething();
}

// Should trigger: Untyped function parameter
export function untypedParams(a, b, c) {
  return a + b + c;
}

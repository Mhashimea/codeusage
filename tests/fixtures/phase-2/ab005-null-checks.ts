// Test fixture for AB005: Missing Null/Undefined Checks
// This file intentionally contains patterns without null checks

// Deep property access without optional chaining - should be detected
function getNestedValue(obj: any) {
  return obj.level1.level2.level3.value;
}

// Array.find result used directly - should be detected
function findUserName(users: any[]) {
  const user = users.find(u => u.id === 1);
  return user.name; // Should use user?.name
}

// Map.get result used directly - should be detected
function getFromMap(map: Map<string, any>) {
  const value = map.get('key');
  return value.property; // Should use value?.property
}

// Array index access without bounds check - should be detected
function getFirstItem(items: any[]) {
  return items[0].name; // Should check if items[0] exists
}

// querySelector result used directly - should be detected
function getElement() {
  const el = document.querySelector('.my-class');
  return el.textContent; // Should use el?.textContent
}

// localStorage.getItem used directly - should be detected
function getStoredValue() {
  const value = localStorage.getItem('key');
  return value.length; // Should check if value exists
}

// pop/shift result used directly - should be detected
function getLastItem(arr: any[]) {
  const item = arr.pop();
  return item.value; // pop may return undefined
}

// Object.keys on potentially null - should be detected
function getObjectKeys(maybeNull: any) {
  return Object.keys(maybeNull);
}

// Spread operator on potentially null - should be detected
function mergeObjects(base: any, override: any) {
  return { ...base, ...override };
}

// for...of on potentially null - should be detected
function iterateItems(items: any) {
  for (const item of items) {
    console.log(item);
  }
}

// Non-null assertion - should be detected
function useNonNull(value: string | null) {
  return value!.length;
}

// Good patterns that should NOT be detected
function safeAccess(obj: any) {
  return obj?.level1?.level2?.value;
}

function safeFind(users: any[]) {
  const user = users.find(u => u.id === 1);
  return user?.name;
}

function safeIterate(items: any[] | null) {
  for (const item of items ?? []) {
    console.log(item);
  }
}

export { getNestedValue, findUserName, safeAccess };

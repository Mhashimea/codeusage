// AB004: Duplicate Logic - this file should trigger duplication issues

// Should trigger: Similar code blocks
export function validateUserA(user: any) {
  if (!user.name) {
    throw new Error('Name is required');
  }
  if (!user.email) {
    throw new Error('Email is required');
  }
  if (!user.age) {
    throw new Error('Age is required');
  }
  return true;
}

export function validateUserB(user: any) {
  if (!user.name) {
    throw new Error('Name is required');
  }
  if (!user.email) {
    throw new Error('Email is required');
  }
  if (!user.age) {
    throw new Error('Age is required');
  }
  return true;
}

// Should trigger: Magic numbers
export function calculatePrice(quantity: number) {
  const basePrice = 100;
  const tax = quantity * 100 * 0.08;
  const shipping = quantity > 100 ? 0 : 15;
  const discount = quantity > 100 ? 0.1 : 0;
  return basePrice * quantity + tax + shipping - (basePrice * quantity * discount);
}

// Should trigger: Repeated string literals
export function getStatus(code: number) {
  if (code === 200) return "success";
  if (code === 201) return "success";
  if (code === 400) return "error";
  if (code === 401) return "error";
  if (code === 500) return "error";
  return "unknown";
}

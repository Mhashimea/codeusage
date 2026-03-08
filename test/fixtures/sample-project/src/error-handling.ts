// AB002: Error Swallowing - this file should trigger error handling issues

export async function fetchData() {
  try {
    const response = await fetch('/api/data');
    return response.json();
  } catch {
    // Should trigger: Empty catch block
  }
}

export async function saveUser(user: any) {
  try {
    await database.save(user);
  } catch (e) {
    // Should trigger: Catch with only console.log
    console.log('error');
  }
}

export function parseConfig(data: string) {
  try {
    return JSON.parse(data);
  } catch (err) {
    // Should trigger: Re-throwing generic error
    throw new Error('Parse failed');
  }
}

export async function processItems(items: any[]) {
  // Should trigger: Promise without catch
  items.forEach(item => {
    processItem(item).then(result => console.log(result));
  });
}

async function processItem(item: any) {
  return item;
}

const database = { save: async (u: any) => u };

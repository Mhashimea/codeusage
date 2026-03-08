// AB008: Over Abstraction - this file should trigger abstraction issues

// Should trigger: Function with too many parameters
export function createUser(
  name: string,
  email: string,
  age: number,
  address: string,
  phone: string,
  company: string,
  department: string,
  role: string,
  salary: number,
  startDate: Date
) {
  return { name, email, age, address, phone, company, department, role, salary, startDate };
}

// Should trigger: Deeply nested callbacks
export function processData(data: any) {
  fetch('/api/users').then(response => {
    response.json().then(users => {
      users.forEach((user: any) => {
        fetch(`/api/users/${user.id}/posts`).then(postsResponse => {
          postsResponse.json().then(posts => {
            posts.forEach((post: any) => {
              console.log(post);
            });
          });
        });
      });
    });
  });
}

// Should trigger: God class with too many methods
export class UserService {
  createUser() {}
  updateUser() {}
  deleteUser() {}
  findUser() {}
  listUsers() {}
  validateUser() {}
  authenticateUser() {}
  authorizeUser() {}
  sendEmail() {}
  generateReport() {}
  exportData() {}
  importData() {}
  backupData() {}
  restoreData() {}
  logActivity() {}
  trackMetrics() {}
}

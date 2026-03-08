// AB001: Hardcoded Credentials - this file should trigger credential detection

const config = {
  // Should trigger: AWS Access Key
  awsKey: "AKIAIOSFODNN7EXAMPLE",

  // Should trigger: OpenAI API Key
  openaiKey: "sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",

  // Should trigger: Database connection string
  dbUrl: "postgres://admin:secretpassword123@localhost:5432/mydb",

  // Should trigger: JWT token
  jwtToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",

  // Should trigger: Generic password
  password: "super_secret_password_123",
};

export default config;

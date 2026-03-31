import { spawn } from "child_process";

console.log("Starting Mock API...");

// Start mock API
const mockApi = spawn("npm", ["run", "mock-api"], {
  shell: true,
  stdio: "inherit"
});

// Wait for server to boot
setTimeout(() => {
  console.log("Running Tests...");

  const test = spawn("npm", ["run", "test"], {
    shell: true,
    stdio: "inherit"
  });

  test.on("exit", (code) => {
    console.log(`Tests finished with code ${code}`);
    process.exit(code ?? 0);
  });

}, 5000);
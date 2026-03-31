import { spawn } from "child_process";

console.log("Starting Mock API...");

const mockApi = spawn("npm", ["run", "mock-api"], {
  shell: true,
  stdio: "inherit"
});

// Handle crash
mockApi.on("error", (err) => {
  console.error("Mock API failed:", err);
  process.exit(1);
});

setTimeout(() => {
  console.log("Running Tests...");

  const test = spawn("npm", ["run", "test"], {
    shell: true,
    stdio: "inherit"
  });

  test.on("exit", (code) => {
    console.log(`Tests finished with code ${code}`);

    mockApi.kill("SIGTERM");
    process.exit(code ?? 0);
  });

}, 5000);
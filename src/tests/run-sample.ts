import fs from "fs";
import { ExecutionEngine } from "../execution/execution-engine";
import type { ExecutionRequest } from "../types";

// Ensure Allure results directory exists (DO NOT DELETE IT)
const allureDir = "/app/reports/allure-results";

try {
  if (!fs.existsSync(allureDir)) {
    fs.mkdirSync(allureDir, { recursive: true });
    console.log("Created Allure results directory");
  } else {
    console.log("Allure results directory already exists");
  }
} catch (err) {
  console.error("Error ensuring Allure directory:", err);
}

// ---------------------------

const MODE = (process.env.MODE as "api" | "web" | "mobile" | "all") || "all";

const getTags = (): string[] => {
  switch (MODE) {
    case "api":
      return ["api"];
    case "web":
      return ["web"];
    case "mobile":
      return ["mobile"];
    case "all":
      return [];
    default:
      return ["api"];
  }
};

const payload: ExecutionRequest = {
  suite: "smoke",
  env: "staging",
  tags: getTags(),
  parallelism: 2,
  retries: 0,
  failFast: false,
  defectProvider: "jira"
};

const run = async (): Promise<void> => {
  const engine = new ExecutionEngine();

  console.log("Starting Test Execution...");
  console.log("Mode:", MODE);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  const summary = await engine.execute(payload);

  console.log("\n========== FINAL SUMMARY ==========");
  console.log(JSON.stringify(summary, null, 2));

  const realFailures = summary.results.filter(
    (r) =>
      r.status === "failed" &&
      !r.error?.includes("ERR_CONNECTION_REFUSED") &&
      !r.error?.includes("Unable to connect to")
  );

  if (realFailures.length > 0) {
    console.error(`Test execution failed with ${realFailures.length} real failure(s)`);
    process.exit(1);
  } else {
    console.log("Execution completed successfully (ignoring infra failures)");
  }
};

void run();
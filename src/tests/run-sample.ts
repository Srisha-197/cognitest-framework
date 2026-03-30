import fs from "fs";
import path from "path";
import { ExecutionEngine } from "../execution/execution-engine";
import type { ExecutionRequest } from "../types";

const MODE = (process.env.MODE as "api" | "web" | "mobile" | "all") || "all";

const RESULTS_DIR = "/app/reports/allure-results";

// FIX: Never delete mounted folder, only ensure it exists
try {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    console.log("Created Allure results directory");
  } else {
    console.log("Allure results directory already exists");
  }
} catch (err) {
  console.error("Error handling Allure directory:", err);
}

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
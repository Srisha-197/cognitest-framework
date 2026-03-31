import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

import { ApiDriver } from "../core/drivers/api-driver";
import { MobileDriver } from "../core/drivers/mobile-driver";
import { WebDriver } from "../core/drivers/web-driver";

import type { HybridTestCase, TestContext } from "../core/base-test";
import { SkipTestError, makeResult } from "../core/base-test";
import type { ExecutionRequest, TestArtifact, TestResult } from "../types";

import { logger } from "../utils/logger";
import { loadEnv } from "../config/env-loader";

const { apiBaseUrl: BASE_URL } = loadEnv();

const isInfraDependencyError = (message: string): boolean =>
  message.includes("playwright install") ||
  message.includes("Executable doesn't exist") ||
  message.includes('Unable to connect to "http://127.0.0.1:4723/wd/hub"');

export class TestRunnerService {
  constructor(
    private readonly webDriver = new WebDriver(),
    private readonly apiDriver = new ApiDriver(),
    private readonly mobileDriver = new MobileDriver()
  ) {}

  // ================= RUN TESTS =================
  async runTests(
    tests: HybridTestCase[],
    request: ExecutionRequest
  ): Promise<TestResult[]> {

    await this.clearAllureResults();

    const parallelism = Math.max(1, request.parallelism ?? 2);
    const queue = [...tests];
    const results: TestResult[] = [];
    let shouldStop = false;

    const worker = async () => {
      while (queue.length > 0) {
        if (request.failFast && shouldStop) return;

        const test = queue.shift();
        if (!test) return;

        const result = await this.runSingleTest(test, request);
        results.push(result);

        if (request.failFast && result.status === "failed") {
          shouldStop = true;
          return;
        }
      }
    };

    await Promise.all(Array.from({ length: parallelism }, () => worker()));

    this.printSummary(results);
    return results;
  }

  // ================= CLEAN ALLURE =================
  private async clearAllureResults(): Promise<void> {
    const dir = path.join(process.cwd(), "reports", "allure-results");

    try {
      await fs.mkdir(dir, { recursive: true });

      const files = await fs.readdir(dir);
      for (const file of files) {
        await fs.unlink(path.join(dir, file));
      }

      console.log("Allure results cleaned");
    } catch (err) {
      console.warn("Allure cleanup skipped:", err);
    }
  }

  // ================= SINGLE TEST =================
  private async runSingleTest(
    test: HybridTestCase,
    request: ExecutionRequest
  ): Promise<TestResult> {

    const startedAt = Date.now();
    const artifacts: TestArtifact[] = [];

    const context: TestContext = {
      env: request.env,
      artifacts
    };

    const runId = `${test.id}-${Date.now()}`;

    try {
      // API
      if (test.platform === "api") {
        context.apiContext = await this.apiDriver.startSession(BASE_URL);
      }

      // WEB
      if (test.platform === "web") {
        const web = await this.webDriver.startSession(runId);
        context.browser = web.browser;
        context.browserContext = web.context;
        context.page = web.page;
      }

      // MOBILE
      if (test.platform === "mobile") {
        context.mobileDriver = await this.mobileDriver.startSession(request.env);
      }

      // RUN TEST
      await test.run(context);

      return makeResult(test, "passed", startedAt, Date.now(), 0, artifacts);

    } catch (error) {
      const endedAt = Date.now();
      const message =
        error instanceof Error ? error.message : "Unknown error";

      if (error instanceof SkipTestError || isInfraDependencyError(message)) {
        return makeResult(test, "skipped", startedAt, endedAt, 0, artifacts, message);
      }

      logger.error({
        event: "test_failure",
        testId: test.id,
        message
      });

      return makeResult(test, "failed", startedAt, endedAt, 0, artifacts, message);

    } finally {
      if (context.apiContext) {
        await this.apiDriver.stopSession(context.apiContext);
      }

      if (context.mobileDriver) {
        await this.mobileDriver.stopSession(context.mobileDriver);
      }

      if (context.browser && context.browserContext && context.page) {
        await this.webDriver.stopSession({
          browser: context.browser,
          context: context.browserContext,
          page: context.page
        });
      }
    }
  }

  // ================= WRITE ALLURE =================
  async writeAllureResults(results: TestResult[]): Promise<void> {
    const dir = path.join(process.cwd(), "reports", "allure-results");
    await fs.mkdir(dir, { recursive: true });

    for (const result of results) {
      const uuid = uuidv4();

      const file = path.join(dir, `${uuid}-result.json`);

      const data = {
        uuid: uuid,
        historyId: result.id,
        name: result.name,
        fullName: result.name,
        status: result.status,
        stage: "finished",

        start: Number(result.startedAt), // ✅ FIXED (must be number)
        stop: Number(result.endedAt),    // ✅ FIXED

        labels: [
          { name: "suite", value: result.suite || "default" },
          { name: "framework", value: "custom" },
          { name: "language", value: "typescript" }
        ]
      };

      await fs.writeFile(file, JSON.stringify(data, null, 2));
    }

    console.log("Allure results written successfully");
  }

  // ================= SUMMARY =================
  private printSummary(results: TestResult[]) {
    console.log("\n========== TEST SUMMARY ==========");

    results.forEach(r => {
      console.log(`${r.id} | ${r.status.toUpperCase()}`);
    });

    console.log("==================================\n");
  }
}
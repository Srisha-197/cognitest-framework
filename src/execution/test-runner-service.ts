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
console.log("[INFO] Loaded API Base URL:", BASE_URL);

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
  async runTests(tests: HybridTestCase[], request: ExecutionRequest): Promise<TestResult[]> {
    await this.clearAllureResults();

    const parallelism = Math.max(1, request.parallelism ?? 2);
    const queue = [...tests];
    const results: TestResult[] = [];
    let shouldStop = false;

    const worker = async (): Promise<void> => {
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

  // ================= ALLURE WRITER =================
  async writeAllureResults(results: TestResult[]): Promise<void> {
    for (const result of results) {
      try {
        await this.writeAllureResult(result);
      } catch (error) {
        logger.error({
          event: "allure_write_error",
          testId: result.id,
          message: error instanceof Error ? error.message : "unknown error"
        });
      }
    }
  }

  // ================= SINGLE TEST =================
  private async runSingleTest(test: HybridTestCase, request: ExecutionRequest): Promise<TestResult> {
    const retries = Math.max(2, request.retries ?? 2);
    let attempt = 0;
    let finalResult: TestResult | undefined;

    while (attempt <= retries) {
      finalResult = await this.executeAttempt(test, request, attempt);

      if (finalResult.status === "passed" || finalResult.status === "skipped") {
        return finalResult;
      }

      attempt++;
    }

    return finalResult ?? makeResult(test, "failed", Date.now(), Date.now(), retries, [], "Unknown");
  }

  // ================= CORE EXECUTION =================
  private async executeAttempt(
    test: HybridTestCase,
    request: ExecutionRequest,
    attempt: number
  ): Promise<TestResult> {

    const startedAt = Date.now();
    const artifacts: TestArtifact[] = [];
    const context: TestContext = { env: request.env, artifacts };

    const runId = `${test.id}-${Date.now()}-${attempt}`;

    try {
      // ---------- API ----------
      if (test.platform === "api") {
        console.log(`[TEST] Creating API context for ${test.id} using baseURL: ${BASE_URL}`);
        context.apiContext = await this.apiDriver.startSession(BASE_URL);
      }

      // ---------- WEB ----------
      if (test.platform === "web") {
        const webSession = await this.webDriver.startSession(runId);
        context.browser = webSession.browser;
        context.browserContext = webSession.context;
        context.page = webSession.page;
      }

      // ---------- MOBILE ----------
      if (test.platform === "mobile") {
        context.mobileDriver = await this.mobileDriver.startSession(request.env);
      }

      // ---------- RUN TEST ----------
      await test.run(context);

      // ---------- WEB ARTIFACTS ----------
      if (context.page) {
        try {
          const url = context.page.url();

          artifacts.push({
            name: "Current URL",
            type: "log",
            content: url,
            path: ""
          });

          const html = await context.page.content();

          artifacts.push({
            name: "Page HTML",
            type: "log",
            content: html,
            path: ""
          });

        } catch (err) {
          logger.warn({
            event: "web_artifact_failed",
            testId: test.id,
            message: err instanceof Error ? err.message : "unknown"
          });
        }
      }

      return makeResult(test, "passed", startedAt, Date.now(), attempt, artifacts);

    } catch (error) {
      const endedAt = Date.now();
      const errorMessage = error instanceof Error ? error.message : "unknown error";

      if (error instanceof SkipTestError || isInfraDependencyError(errorMessage)) {
        return makeResult(test, "skipped", startedAt, endedAt, attempt, artifacts, errorMessage);
      }

      logger.error({
        event: "test_failure",
        testId: test.id,
        attempt,
        message: errorMessage
      });

      // ---------- SCREENSHOT ----------
      if (context.page) {
        try {
          const screenshotDir = path.join(process.cwd(), "reports", "screenshots");
          await fs.mkdir(screenshotDir, { recursive: true });

          const screenshotPath = path.join(
            screenshotDir,
            `${test.id}-${attempt}-${Date.now()}.png`
          );

          await context.page.screenshot({ path: screenshotPath });

          artifacts.push({
            name: "Screenshot",
            type: "screenshot",
            path: screenshotPath,
            content: "" // content not needed, path is sufficient
          });

        } catch (screenshotError) {
          logger.warn({
            event: "screenshot_failed",
            testId: test.id,
            attempt,
            message: screenshotError instanceof Error ? screenshotError.message : "unknown"
          });
        }
      }

      return makeResult(test, "failed", startedAt, endedAt, attempt, artifacts, errorMessage);

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

  // ================= SUMMARY =================
  private printSummary(results: TestResult[]) {
    console.log("\n========== TEST SUMMARY ==========");

    results.forEach(r => {
      console.log(`${r.id} | ${r.name} | ${r.status.toUpperCase()} | ${r.durationMs}ms`);
    });

    const passed = results.filter(r => r.status === "passed").length;
    const failed = results.filter(r => r.status === "failed").length;
    const skipped = results.filter(r => r.status === "skipped").length;

    console.log("\n----------------------------------");
    console.log(`Total   : ${results.length}`);
    console.log(`Passed  : ${passed}`);
    console.log(`Failed  : ${failed}`);
    console.log(`Skipped : ${skipped}`);
    console.log("==================================\n");
  }

  // ================= CLEAN ALLURE =================
  private async clearAllureResults(): Promise<void> {
    const dir = path.join(process.cwd(), "reports", "allure-results");

    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
  }

  // ================= WRITE ALLURE =================
  private async writeAllureResult(result: TestResult): Promise<void> {

    const dir = path.join(process.cwd(), "reports", "allure-results");
    await fs.mkdir(dir, { recursive: true });

    const uuid = uuidv4();
    const file = path.join(dir, `${uuid}-result.json`);

    const attachments = result.artifacts?.map((a, index) => ({
      name: a.name ?? `artifact-${index}`,
      type: a.type === "screenshot" ? "image/png" : "text/plain",
      source: `${uuid}-attachment-${index}${a.type === "screenshot" ? ".png" : ".txt"}`
    })) ?? [];

    const allureData = {
      uuid,
      name: result.name,
      fullName: result.id,
      status: result.status,
      stage: "finished",
      start: new Date(result.startedAt).getTime(),
      stop: new Date(result.endedAt).getTime(),

      statusDetails:
        result.status === "failed"
          ? {
              message: result.error,
              trace: result.error
            }
          : undefined,

      labels: [
        { name: "suite", value: result.suite },
        { name: "framework", value: "cognitest" },
        { name: "platform", value: result.platform },
        ...(result.tags || []).map((tag) => ({ name: "tag", value: tag }))
      ],

      links: result.defectId
        ? [
            {
              name: "JIRA",
              url: `https://srish7035.atlassian.net/browse/${result.defectId}`,
              type: "issue"
            }
          ]
        : [],

      attachments
    };

    await fs.writeFile(file, JSON.stringify(allureData, null, 2));

    // ---------- WRITE ATTACHMENTS ----------
    for (let i = 0; i < (result.artifacts?.length || 0); i++) {
      const artifact = result.artifacts[i];

      const filename = `${uuid}-attachment-${i}${artifact.type === "screenshot" ? ".png" : ".txt"}`;
      const filePath = path.join(dir, filename);

      if (artifact.type === "screenshot" && artifact.path) {
        await fs.copyFile(artifact.path, filePath);
      } else if (artifact.content) {
        await fs.writeFile(filePath, artifact.content, "utf8");
      }
    }
  }
}
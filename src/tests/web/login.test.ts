import { LoginPage } from "../../pages/web/login.page";
import { readCSV, LoginTestData } from "../../utils/csv-reader";
import type { HybridTestCase, TestContext } from "../../core/base-test";

const csvData: LoginTestData[] = readCSV("src/testdata/web/login.data.csv");

// Filter valid rows
const validData = csvData.filter(
  (d) =>
    d.testcaseId &&
    d.usernameValue &&
    d.passwordValue &&
    d.expectedResult
);

export const LoginTests: HybridTestCase[] = validData.map((data) => ({
  id: data.testcaseId,
  name: `Login Test - ${data.testcaseId}`,
  suite: "smoke",
  platform: "web",
  tags: ["web"],

  run: async (context: TestContext) => {
    console.log(`[TEST] Starting ${data.testcaseId}: Login Test`);

    if (!context.page) {
      throw new Error("Page not initialized");
    }

    const page = context.page;
    const login = new LoginPage(page);

    const baseUrl =
      context.baseUrl ||
      process.env.WEB_BASE_URL ||
      "https://canvas-preuat.muzaini.com/";

    try {
      // ================= NAVIGATION =================
      console.log(`[WEB] Navigating to ${baseUrl}`);

      for (let i = 0; i < 3; i++) {
        try {
          await login.navigate(baseUrl);
          break;
        } catch (err) {
          if (i === 2) throw err;
          await page.waitForTimeout(2000);
        }
      }

      // ================= LOGIN ACTION =================
      console.log(`[WEB] Performing login for ${data.usernameValue}`);

      await login.login(data.usernameValue, data.passwordValue);

      await page.waitForLoadState("networkidle");

      // ================= CAPTURE RESPONSE =================
      let actual = "";

      if (data.expectedResult.toLowerCase().includes("explore")) {
        actual = await login.getDashboardMessage();
      } else {
        actual = await login.getToasterMessage();
      }

      // ================= ARTIFACTS =================
      context.artifacts?.push({
        name: "Login Request",
        type: "log",
        path: "",
        content: JSON.stringify(
          {
            username: data.usernameValue,
            password: data.passwordValue,
            url: baseUrl,
          },
          null,
          2
        ),
      });

      context.artifacts?.push({
        name: "Login Response",
        type: "log",
        path: "",
        content: JSON.stringify(
          {
            expected: data.expectedResult,
            actual,
          },
          null,
          2
        ),
      });

      console.log(`[TEST ${data.testcaseId}] Actual: ${actual}`);

      // ================= VALIDATION =================
      if (!actual.includes(data.expectedResult)) {
        throw new Error(
          `Login failed -> Expected: ${data.expectedResult}, Got: ${actual}`
        );
      }

      console.log(`[TEST] ${data.testcaseId} Passed ✅`);

    } catch (error) {
      console.error(`[TEST] ${data.testcaseId} Failed ❌`);

      // ================= SCREENSHOT =================
      const screenshotPath = `reports/screenshots/${data.testcaseId}.png`;

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      context.artifacts?.push({
        name: "Failure Screenshot",
        type: "screenshot",
        path: screenshotPath,
        content: "",
      });

      throw error;
    }
  },
}));
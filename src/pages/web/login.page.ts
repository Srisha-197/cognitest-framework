import { Page } from "@playwright/test";
import { LoginLocators } from "../../locators/web/login.locators";

export class LoginPage {
  constructor(private page: Page) {}

  async navigate(baseUrl: string) {
    console.log("[WEB] Navigating:", baseUrl);

    await this.page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await this.page.waitForLoadState("networkidle");
  }

  async login(username: string, password: string) {
    const usernameField = this.page.locator(
      "input[placeholder='Username'], input[name='username']"
    );

    await usernameField.waitFor({ state: "visible", timeout: 30000 });
    await usernameField.fill(username);

    const passwordField = this.page.locator(
      "input[placeholder='Password'], input[type='password']"
    );

    await passwordField.fill(password);

    await this.page.screenshot({
      path: `reports/screenshots/before-login.png`,
    });

    await this.page.locator("button:has-text('Login')").click();
  }

  async getToasterMessage(): Promise<string> {
    const toast = this.page.locator(".Toastify__toast");

    await toast.waitFor({ timeout: 10000 });
    return await toast.innerText();
  }

  async getDashboardMessage(): Promise<string> {
    const msg = this.page.locator(
      "text=Let's explore easy transfer with our platform"
    );

    await msg.waitFor({ timeout: 20000 });
    return await msg.innerText();
  }
}
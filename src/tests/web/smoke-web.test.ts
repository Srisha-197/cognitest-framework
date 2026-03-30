import { HybridTestCase } from "../../core/base-test";

const BASE_URL =
  process.env.BASE_URL || "https://canvas-preuat.muzaini.com/";

export const smokeWebTest: HybridTestCase = {
  id: "WEB-001",
  name: "Homepage validation",
  platform: "web",
  suite: "smoke",
  tags: ["web"],

  run: async (ctx) => {
    const page = ctx.page!;

    await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForLoadState("networkidle");

    const title = await page.title();

    if (!title) {
      throw new Error("Homepage not loaded properly");
    }

    console.log("Homepage loaded successfully:", title);
  }
};
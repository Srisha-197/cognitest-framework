"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebDriver = void 0;
const playwright_1 = require("playwright");
const node_path_1 = __importDefault(require("node:path"));
class WebDriver {
    async startSession(runId) {
        const browser = await playwright_1.chromium.launch({ headless: true });
        const context = await browser.newContext({
            recordVideo: { dir: node_path_1.default.join(process.cwd(), "reports", "videos", runId) }
        });
        const page = await context.newPage();
        return { browser, context, page };
    }
    async stopSession(session) {
        await session.context.close();
        await session.browser.close();
    }
}
exports.WebDriver = WebDriver;

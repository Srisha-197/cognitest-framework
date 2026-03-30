import axios, { AxiosInstance } from "axios";
import fs from "fs";
import FormData from "form-data";
import { loadEnv } from "../config/env-loader";
import type { TestResult } from "../types";

export class JiraClient {
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly apiToken: string;
  private readonly projectKey: string;
  private readonly accountId?: string;

  private readonly http: AxiosInstance;

  constructor() {
    const env = loadEnv();

    this.baseUrl = env.jiraBaseUrl!;
    this.email = env.jiraEmail!;
    this.apiToken = env.jiraApiToken!;
    this.projectKey = env.jiraProjectKey!;
    this.accountId = env.jiraAccountId;
    if (!this.baseUrl || !this.email || !this.apiToken || !this.projectKey) {
      throw new Error("Jira environment variables are missing");
    }

    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString("base64");

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      }
    });
  }

  /**
   * Create Jira Bug for failed test
   */
  async createDefect(result: TestResult): Promise<string | undefined> {
    try {
      console.log(`Creating Jira issue for: ${result.id}`);

      const payload: any = {
        fields: {
          project: {
            key: this.projectKey
          },
          summary: `${result.id} - ${result.name} FAILED`,
          description: this.buildDescription(result),
          issuetype: {
            name: "Bug"
          },
          labels: ["automation", "api-failure"]
        }
      };

      //optional auto-assign
      if (this.accountId) {
        payload.fields.assignee = {
          id: this.accountId
        };
      }

      const response = await this.http.post("/rest/api/3/issue", payload);

      const issueKey = response.data.key;

      console.log(`Jira Issue Created: ${issueKey}`);

      return issueKey;
    } catch (error: any) {
      console.error("Jira creation failed:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return undefined;
    }
  }

  /**
   * Attach file to Jira issue (logs/screenshots)
   */
  async attachFile(issueKey: string, filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
      }

      const form = new FormData();
      form.append("file", fs.createReadStream(filePath));

      await axios.post(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/attachments`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: this.http.defaults.headers.Authorization,
            "X-Atlassian-Token": "no-check"
          }
        }
      );

      console.log(`Attachment uploaded to ${issueKey}`);
    } catch (error: any) {
      console.error("Attachment upload failed:", error.message);
    }
  }

  /**
   * Build rich Jira description (ADF format)
   */
  private buildDescription(result: TestResult) {
    return {
      type: "doc",
      version: 1,
      content: [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Test Failure Details" }]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: `Test ID: ${result.id}` }
          ]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: `Test Name: ${result.name}` }
          ]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: `Status: ${result.status}` }
          ]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `Error: ${result.error || "No error message"}`
            }
          ]
        }
      ]
    };
  }
}
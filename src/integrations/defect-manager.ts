import type { TestResult } from "../types";
import { AdoClient } from "./ado-client";
import { JiraClient } from "./jira-client";

export class DefectManager {
  constructor(
    private readonly jiraClient = new JiraClient(),
    private readonly adoClient = new AdoClient()
  ) {}

  async createForFailure(
    provider: "jira" | "ado" | "both" | "none",
    result: TestResult
  ): Promise<string | undefined> {

    //Only create defect if failed
    if (result.status !== "failed" || provider === "none") {
      return undefined;
    }

    console.log(`[DEFECT] Creating defect for ${result.id} using ${provider}`);

    try {
      if (provider === "jira") {
        const jiraId = await this.jiraClient.createDefect(result);
        console.log(`[JIRA] Ticket Created: ${jiraId}`);
        return jiraId;
      }

      if (provider === "ado") {
        const adoId = await this.adoClient.createBug(result);
        console.log(`[ADO] Bug Created: ${adoId}`);
        return adoId;
      }

      // both
      const [jiraId, adoId] = await Promise.all([
        this.jiraClient.createDefect(result),
        this.adoClient.createBug(result)
      ]);

      console.log(`[DEFECT] Jira: ${jiraId}, ADO: ${adoId}`);
      return `${jiraId},${adoId}`;
    } catch (error: any) {
      console.error("[DEFECT ERROR]", error.message);
      return undefined;
    }
  }
}
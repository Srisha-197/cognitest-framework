import dotenv from "dotenv";

export interface EngineEnv {
  nodeEnv: string;
  logLevel: string;
  apiBaseUrl: string;
  jiraBaseUrl?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
  jiraAccountId?: string;
  adoBaseUrl?: string;
  postgresUrl?: string;
}

export const loadEnv = (): EngineEnv => {
  dotenv.config();
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    logLevel: process.env.LOG_LEVEL ?? "info",
    apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:4000",
    jiraBaseUrl: process.env.JIRA_BASE_URL,
    jiraEmail: process.env.JIRA_EMAIL,
    jiraApiToken: process.env.JIRA_API_TOKEN,
    jiraProjectKey: process.env.JIRA_PROJECT_KEY,
    jiraAccountId: process.env.JIRA_ACCOUNT_ID,
    adoBaseUrl: process.env.ADO_BASE_URL,
    postgresUrl: process.env.POSTGRES_URL
  };
};

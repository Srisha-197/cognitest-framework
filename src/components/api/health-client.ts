import type { APIRequestContext, APIResponse } from "playwright";

export class HealthClient {
  constructor(private readonly client: APIRequestContext) {}

  async getHealth(): Promise<APIResponse> {
    const endpoint = "/health";
    console.log("[API] GET", endpoint);
    return this.client.get(endpoint);
  }
}

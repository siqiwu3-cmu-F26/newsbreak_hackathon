/**
 * Shared Anthropic client setup, used by every LLM call in the AI Agent
 * (backend/services/agent.js for /plan, backend/services/skillAgent.js for
 * Offer a Skill extraction). Kept in one place so API key / workspace-id /
 * timeout handling only exists once.
 */

import Anthropic from "@anthropic-ai/sdk";

export const ANTHROPIC_TIMEOUT_MS = 15000; // design doc §4: frontend cuts over to fallback past 15s anyway

let client;

export function getAnthropicClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env and fill it in."
      );
    }
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic({
      apiKey,
      timeout: ANTHROPIC_TIMEOUT_MS,
      // This key is org-level, not workspace-scoped, so every request must
      // carry the workspace id explicitly.
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });
  }
  return client;
}

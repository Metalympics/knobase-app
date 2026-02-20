import type { Agent, AgentCapability } from "@/lib/agents/types";

export interface OpenClawConfig {
  name: string;
  displayName?: string;
  version?: string;
  description?: string;
  mcp?: {
    endpoint: string;
    transport: string;
    authentication?: { type: string; envKey?: string };
  };
  tools?: string[];
  resources?: string[];
  prompts?: {
    system?: string;
    examples?: string[];
  };
  agents?: OpenClawAgentConfig[];
  settings?: Record<string, unknown>;
}

export interface OpenClawAgentConfig {
  name: string;
  avatar?: string;
  color?: string;
  personality?: string;
  capabilities?: string[];
  tools?: string[];
  prompts?: { system?: string };
}

export interface ParseResult {
  success: boolean;
  config: OpenClawConfig | null;
  errors: string[];
}

export function parseOpenClawConfig(raw: string): ParseResult {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    const cleaned = raw
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,\s*([\]}])/g, "$1");
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return {
      success: false,
      config: null,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`],
    };
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.name || typeof obj.name !== "string") {
    errors.push('Missing required field: "name"');
  }

  if (obj.agents && !Array.isArray(obj.agents)) {
    errors.push('"agents" must be an array');
  }

  if (obj.tools && !Array.isArray(obj.tools)) {
    errors.push('"tools" must be an array');
  }

  if (errors.length > 0) {
    return { success: false, config: null, errors };
  }

  const config: OpenClawConfig = {
    name: obj.name as string,
    displayName: (obj.displayName as string) ?? obj.name as string,
    version: (obj.version as string) ?? "1.0.0",
    description: obj.description as string | undefined,
    mcp: obj.mcp as OpenClawConfig["mcp"],
    tools: obj.tools as string[] | undefined,
    resources: obj.resources as string[] | undefined,
    prompts: obj.prompts as OpenClawConfig["prompts"],
    agents: obj.agents as OpenClawAgentConfig[] | undefined,
    settings: obj.settings as Record<string, unknown> | undefined,
  };

  return { success: true, config, errors: [] };
}

const VALID_CAPABILITIES: AgentCapability[] = ["read", "write", "suggest", "chat"];

export function openClawAgentToKnobase(
  agentConfig: OpenClawAgentConfig
): Partial<Omit<Agent, "id" | "createdAt" | "updatedAt">> {
  const capabilities = (agentConfig.capabilities ?? ["read", "chat"])
    .filter((c): c is AgentCapability => VALID_CAPABILITIES.includes(c as AgentCapability));

  return {
    name: agentConfig.name,
    avatar: agentConfig.avatar ?? "🤖",
    color: agentConfig.color ?? "#8B5CF6",
    status: "online",
    personality: agentConfig.personality ?? agentConfig.prompts?.system ?? "Helpful AI assistant.",
    capabilities,
  };
}

export function knobaseAgentToOpenClaw(agent: Agent): OpenClawAgentConfig {
  return {
    name: agent.name,
    avatar: agent.avatar,
    color: agent.color,
    personality: agent.personality,
    capabilities: agent.capabilities,
    prompts: { system: agent.personality },
  };
}

export function generateOpenClawExport(
  agents: Agent[],
  workspaceName: string,
  endpoint = "http://localhost:3000/api/mcp"
): OpenClawConfig {
  return {
    name: workspaceName.toLowerCase().replace(/\s+/g, "-"),
    displayName: workspaceName,
    version: "1.0.0",
    description: `Exported from ${workspaceName} Knobase workspace`,
    mcp: {
      endpoint,
      transport: "http",
      authentication: { type: "bearer", envKey: "MCP_API_KEY" },
    },
    tools: ["list_documents", "read_document", "write_document", "search_documents", "delete_document", "list_agents"],
    resources: ["workspace://info", "document://{id}"],
    prompts: {
      system: `You have access to the ${workspaceName} Knobase workspace via MCP.`,
      examples: [
        "Show me my recent documents",
        "Search my knowledge base for {query}",
      ],
    },
    agents: agents.map(knobaseAgentToOpenClaw),
    settings: { syncEnabled: true, syncInterval: 10000, autoContext: true },
  };
}

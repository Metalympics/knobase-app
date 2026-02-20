import { getSlackConnection } from "./oauth";

export interface SlackCommand {
  command: string;
  text: string;
  userId: string;
  channelId: string;
  responseUrl: string;
}

export interface SlackCommandResponse {
  response_type: "in_channel" | "ephemeral";
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: unknown[];
  [key: string]: unknown;
}

export function parseCommand(text: string): { action: string; args: string } {
  const trimmed = text.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { action: trimmed, args: "" };
  return { action: trimmed.slice(0, spaceIdx), args: trimmed.slice(spaceIdx + 1).trim() };
}

export function handleSearchCommand(query: string): SlackCommandResponse {
  if (!query) {
    return {
      response_type: "ephemeral",
      text: "Usage: `/knobase search [query]`",
    };
  }

  return {
    response_type: "ephemeral",
    text: `Searching for "${query}"...`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔍 *Search results for "${query}"*`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "_Searching your Knobase documents..._\nResults will appear here when connected to the API.",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open in Knobase" },
            url: `${typeof window !== "undefined" ? window.location.origin : ""}/search?q=${encodeURIComponent(query)}`,
          },
        ],
      },
    ],
  };
}

export function handleShareCommand(docUrl: string): SlackCommandResponse {
  if (!docUrl) {
    return {
      response_type: "ephemeral",
      text: "Usage: `/knobase share [document-url]`",
    };
  }

  return {
    response_type: "in_channel",
    text: `📄 Shared a Knobase document`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📄 *Shared Document*\n${docUrl}`,
        },
      },
    ],
  };
}

export function handleNotifyCommand(args: string): SlackCommandResponse {
  const parts = args.split(" ");
  if (parts.length < 2) {
    return {
      response_type: "ephemeral",
      text: "Usage: `/knobase notify [doc-id] [channel]`",
    };
  }

  const [docId, channel] = parts;
  return {
    response_type: "ephemeral",
    text: `Notifications for document \`${docId}\` will be sent to <#${channel}>`,
  };
}

export function routeCommand(command: SlackCommand): SlackCommandResponse {
  const { action, args } = parseCommand(command.text);

  switch (action) {
    case "search":
      return handleSearchCommand(args);
    case "share":
      return handleShareCommand(args);
    case "notify":
      return handleNotifyCommand(args);
    case "help":
      return {
        response_type: "ephemeral",
        text: [
          "*Knobase Commands:*",
          "• `/knobase search [query]` — Search documents",
          "• `/knobase share [doc-url]` — Share a document in channel",
          "• `/knobase notify [doc-id] [channel]` — Set up notifications",
          "• `/knobase help` — Show this message",
        ].join("\n"),
      };
    default:
      return {
        response_type: "ephemeral",
        text: `Unknown command: \`${action}\`. Try \`/knobase help\``,
      };
  }
}

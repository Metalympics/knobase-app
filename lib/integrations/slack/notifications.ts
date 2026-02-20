import { getSlackConnection } from "./oauth";

export interface SlackNotification {
  channel: string;
  title: string;
  author: string;
  preview: string;
  link: string;
  event: "created" | "updated" | "commented";
}

function eventEmoji(event: SlackNotification["event"]): string {
  switch (event) {
    case "created":
      return "📝";
    case "updated":
      return "✏️";
    case "commented":
      return "💬";
  }
}

function eventLabel(event: SlackNotification["event"]): string {
  switch (event) {
    case "created":
      return "New Document";
    case "updated":
      return "Document Updated";
    case "commented":
      return "New Comment";
  }
}

export async function sendSlackNotification(notification: SlackNotification): Promise<boolean> {
  const conn = getSlackConnection();
  if (!conn?.botToken) return false;

  const shouldNotify = (
    (notification.event === "created" && conn.notifyOnCreate) ||
    (notification.event === "updated" && conn.notifyOnUpdate) ||
    (notification.event === "commented" && conn.notifyOnComment)
  );

  if (!shouldNotify) return false;

  const emoji = eventEmoji(notification.event);
  const label = eventLabel(notification.event);

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: notification.channel || conn.channelId,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${emoji} *${label}*`,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Title:*\n${notification.title}` },
              { type: "mrkdwn", text: `*Author:*\n${notification.author}` },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: notification.preview.length > 300
                ? notification.preview.slice(0, 300) + "..."
                : notification.preview,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Open in Knobase" },
                url: notification.link,
                style: "primary",
              },
            ],
          },
        ],
        text: `${emoji} ${label}: ${notification.title} by ${notification.author}`,
      }),
    });

    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function sendTestMessage(): Promise<boolean> {
  const conn = getSlackConnection();
  if (!conn?.botToken || !conn.channelId) return false;

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: conn.channelId,
        text: "👋 Hello from Knobase! Notifications are working.",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "👋 *Hello from Knobase!*\nNotifications are configured and working for this channel.",
            },
          },
        ],
      }),
    });

    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

import { saveConfig, type CLIConfig } from "../lib/client";
import { createInterface } from "readline";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function login() {
  console.log("\n  Knobase CLI Login\n");

  const apiUrl = (await prompt("  API URL (default: http://localhost:3000): ")) || "http://localhost:3000";
  const apiKey = await prompt("  API Key: ");

  if (!apiKey) {
    console.error("  API key is required.");
    process.exit(1);
  }

  // Verify the key works
  try {
    const res = await fetch(`${apiUrl}/api/v1/documents?limit=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error(`  Authentication failed (${res.status}). Check your API key.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`  Could not connect to ${apiUrl}. Is the server running?`);
    process.exit(1);
  }

  const config: CLIConfig = { apiUrl, apiKey };
  saveConfig(config);

  console.log("\n  Authenticated successfully!");
  console.log(`  Config saved to ~/.knobase/config.json\n`);
}

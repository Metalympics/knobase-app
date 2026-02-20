#!/usr/bin/env node

import { login } from "./commands/login";
import { push } from "./commands/push";
import { pull } from "./commands/pull";
import { list } from "./commands/list";
import { search } from "./commands/search";
import { sync } from "./commands/sync";

const args = process.argv.slice(2);
const command = args[0];
const rest = args.slice(1);

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(args[i]);
    }
  }

  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseFlags(rest);

  switch (command) {
    case "login":
      await login();
      break;

    case "push":
      await push(positional[0]);
      break;

    case "pull":
      await pull(positional[0], positional[1]);
      break;

    case "list":
    case "ls":
      await list({ limit: flags.limit, search: flags.search });
      break;

    case "search":
      await search(positional.join(" "), { tags: flags.tags });
      break;

    case "sync":
      await sync(positional[0]);
      break;

    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      break;

    case "version":
    case "--version":
    case "-v":
      console.log("knobase-cli v1.0.0");
      break;

    default:
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
  knobase-cli — Manage Knobase documents from the terminal

  USAGE
    knobase <command> [options]

  COMMANDS
    login                      Authenticate with your Knobase instance
    push <file.md>             Upload a markdown file as a document
    pull <doc-id> [path]       Download a document as markdown
    list [--limit N]           List all documents
    search <query> [--tags t]  Search documents
    sync [directory]           Sync a folder of markdown files
    help                       Show this message
    version                    Show version

  EXAMPLES
    knobase login
    knobase push my-notes.md
    knobase pull abc-123 ./notes.md
    knobase list --limit 50
    knobase search "project plan" --tags work,planning
    knobase sync ./my-docs/

  CONFIG
    Authentication stored at ~/.knobase/config.json
`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
  author: string;
  category: "research" | "coding" | "writing" | "review" | "creative";
  downloads: number;
  rating: number;
  ratingCount: number;
  personality: string;
  capabilities: string[];
  featured: boolean;
}

const LS_KEY = "knobase-app:marketplace";

const SEED_AGENTS: MarketplaceAgent[] = [
  {
    id: "mp-researcher",
    name: "Researcher",
    description:
      "Expert at finding information, synthesizing sources, and adding proper citations to your documents.",
    avatar: "🔍",
    color: "#2563EB",
    author: "Knobase Team",
    category: "research",
    downloads: 1243,
    rating: 4.7,
    ratingCount: 89,
    personality:
      "Thorough and analytical. Always cites sources and cross-references information. Prefers evidence-based reasoning.",
    capabilities: ["read", "suggest", "chat"],
    featured: true,
  },
  {
    id: "mp-coder",
    name: "Coder",
    description:
      "GitHub-integrated coding assistant. Writes, reviews, and explains code with best practices built in.",
    avatar: "💻",
    color: "#059669",
    author: "Knobase Team",
    category: "coding",
    downloads: 2087,
    rating: 4.8,
    ratingCount: 156,
    personality:
      "Precise and efficient. Writes clean, well-documented code. Follows established patterns and suggests improvements.",
    capabilities: ["read", "write", "suggest", "chat"],
    featured: true,
  },
  {
    id: "mp-scribe",
    name: "Scribe",
    description:
      "Formatting wizard that cleans up your documents, fixes grammar, and ensures consistent style throughout.",
    avatar: "✍️",
    color: "#D97706",
    author: "Knobase Team",
    category: "writing",
    downloads: 876,
    rating: 4.5,
    ratingCount: 62,
    personality:
      "Detail-oriented perfectionist. Catches typos, fixes formatting, and ensures documents read beautifully. Follows AP style by default.",
    capabilities: ["read", "write", "suggest"],
    featured: false,
  },
  {
    id: "mp-reviewer",
    name: "Reviewer",
    description:
      "Code-review style feedback for any document. Leaves inline comments and suggestions like a thorough PR reviewer.",
    avatar: "👁️",
    color: "#DC2626",
    author: "Knobase Team",
    category: "review",
    downloads: 654,
    rating: 4.6,
    ratingCount: 45,
    personality:
      "Constructive and direct. Points out issues clearly with specific suggestions. Balances criticism with praise for what works well.",
    capabilities: ["read", "suggest", "chat"],
    featured: false,
  },
  {
    id: "mp-brainstormer",
    name: "Brainstormer",
    description:
      "Ideation partner that helps you explore ideas, challenge assumptions, and discover unexpected connections.",
    avatar: "💡",
    color: "#7C3AED",
    author: "Knobase Team",
    category: "creative",
    downloads: 1567,
    rating: 4.9,
    ratingCount: 203,
    personality:
      "Energetic and creative. Asks provocative questions, suggests wild ideas, and helps connect dots. Never shoots down an idea—builds on everything.",
    capabilities: ["read", "chat", "suggest"],
    featured: true,
  },
];

function readMarketplace(): MarketplaceAgent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_KEY, JSON.stringify(SEED_AGENTS));
      }
      return SEED_AGENTS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_AGENTS;
  }
}

function writeMarketplace(agents: MarketplaceAgent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(agents));
}

export function getMarketplaceAgents(): MarketplaceAgent[] {
  return readMarketplace();
}

export function getFeaturedAgents(): MarketplaceAgent[] {
  return readMarketplace().filter((a) => a.featured);
}

export function getMarketplaceAgent(id: string): MarketplaceAgent | null {
  return readMarketplace().find((a) => a.id === id) ?? null;
}

export function searchMarketplace(query: string): MarketplaceAgent[] {
  const q = query.toLowerCase();
  return readMarketplace().filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.includes(q) ||
      a.author.toLowerCase().includes(q),
  );
}

export function filterByCategory(
  category: MarketplaceAgent["category"],
): MarketplaceAgent[] {
  return readMarketplace().filter((a) => a.category === category);
}

export function incrementDownloads(id: string): void {
  const agents = readMarketplace();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx !== -1) {
    agents[idx].downloads++;
    writeMarketplace(agents);
  }
}

export const CATEGORIES: {
  value: MarketplaceAgent["category"];
  label: string;
  icon: string;
}[] = [
  { value: "research", label: "Research", icon: "🔍" },
  { value: "coding", label: "Coding", icon: "💻" },
  { value: "writing", label: "Writing", icon: "✍️" },
  { value: "review", label: "Review", icon: "👁️" },
  { value: "creative", label: "Creative", icon: "💡" },
];

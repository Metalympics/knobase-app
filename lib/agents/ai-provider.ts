export interface AIResult {
  content: string;
  reasoning: string;
  model: string;
}

type Provider = "openai" | "anthropic";

function getProvider(): Provider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local"
  );
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string
): Promise<AIResult> {
  const provider = getProvider();

  if (provider === "anthropic") {
    return callAnthropic(systemPrompt, userPrompt);
  }
  return callOpenAI(systemPrompt, userPrompt);
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<AIResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `OpenAI error ${res.status}: ${err.error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  return parseAIResponse(raw, model);
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<AIResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Anthropic error ${res.status}: ${err.error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();
  const raw =
    data.content?.[0]?.type === "text" ? data.content[0].text : "";

  return parseAIResponse(raw, model);
}

function parseAIResponse(raw: string, model: string): AIResult {
  // Try to parse as JSON first (as instructed in system prompt)
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        content: parsed.content ?? raw,
        reasoning: parsed.reasoning ?? "",
        model,
      };
    }
  } catch {
    // fall through to plain text
  }

  return { content: raw, reasoning: "", model };
}

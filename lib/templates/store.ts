import { DEFAULT_TEMPLATES, type Template } from "./defaults";

const LS_KEY = "knobase-app:custom-templates";

function readCustom(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCustom(templates: Template[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(templates));
}

export function getAllTemplates(): Template[] {
  return [...DEFAULT_TEMPLATES, ...readCustom()];
}

export function getTemplate(id: string): Template | null {
  return getAllTemplates().find((t) => t.id === id) ?? null;
}

export function saveCustomTemplate(template: Omit<Template, "id" | "isCustom">): Template {
  const custom = readCustom();
  const t: Template = {
    ...template,
    id: `custom-${crypto.randomUUID()}`,
    isCustom: true,
  };
  custom.push(t);
  writeCustom(custom);
  return t;
}

export function deleteCustomTemplate(id: string): void {
  const custom = readCustom().filter((t) => t.id !== id);
  writeCustom(custom);
}

export function updateCustomTemplate(id: string, patch: Partial<Template>): void {
  const custom = readCustom();
  const idx = custom.findIndex((t) => t.id === id);
  if (idx !== -1) {
    custom[idx] = { ...custom[idx], ...patch };
    writeCustom(custom);
  }
}

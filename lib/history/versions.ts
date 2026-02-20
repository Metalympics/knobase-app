const LS_PREFIX = "knobase-app:versions:";

export interface Version {
  id: string;
  documentId: string;
  timestamp: string;
  name?: string;
  content: string;
  author: string;
}

function readVersions(documentId: string): Version[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${documentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeVersions(documentId: string, versions: Version[]): void {
  const maxVersions = 50;
  const trimmed = versions.slice(-maxVersions);
  localStorage.setItem(`${LS_PREFIX}${documentId}`, JSON.stringify(trimmed));
}

export function getVersions(documentId: string): Version[] {
  return readVersions(documentId).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function saveVersion(
  documentId: string,
  content: string,
  author: string = "You",
  name?: string
): Version {
  const versions = readVersions(documentId);
  const version: Version = {
    id: crypto.randomUUID(),
    documentId,
    timestamp: new Date().toISOString(),
    content,
    author,
    ...(name ? { name } : {}),
  };
  versions.push(version);
  writeVersions(documentId, versions);
  return version;
}

export function nameVersion(documentId: string, versionId: string, name: string): void {
  const versions = readVersions(documentId);
  const v = versions.find((v) => v.id === versionId);
  if (v) {
    v.name = name;
    writeVersions(documentId, versions);
  }
}

export function getVersion(documentId: string, versionId: string): Version | null {
  return readVersions(documentId).find((v) => v.id === versionId) ?? null;
}

export function deleteVersion(documentId: string, versionId: string): void {
  const versions = readVersions(documentId).filter((v) => v.id !== versionId);
  writeVersions(documentId, versions);
}

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

export function diffVersions(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const result: DiffLine[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi >= oldLines.length) {
      result.push({ type: "added", text: newLines[ni] });
      ni++;
    } else if (ni >= newLines.length) {
      result.push({ type: "removed", text: oldLines[oi] });
      oi++;
    } else if (oldLines[oi] === newLines[ni]) {
      result.push({ type: "unchanged", text: oldLines[oi] });
      oi++;
      ni++;
    } else {
      let foundInNew = newLines.indexOf(oldLines[oi], ni);
      let foundInOld = oldLines.indexOf(newLines[ni], oi);

      if (foundInNew !== -1 && (foundInOld === -1 || foundInNew - ni <= foundInOld - oi)) {
        while (ni < foundInNew) {
          result.push({ type: "added", text: newLines[ni] });
          ni++;
        }
      } else if (foundInOld !== -1) {
        while (oi < foundInOld) {
          result.push({ type: "removed", text: oldLines[oi] });
          oi++;
        }
      } else {
        result.push({ type: "removed", text: oldLines[oi] });
        result.push({ type: "added", text: newLines[ni] });
        oi++;
        ni++;
      }
    }
  }

  return result;
}

const AUTO_SAVE_KEY = "knobase-app:autosave-timers";

export function shouldAutoSave(documentId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const timers = JSON.parse(localStorage.getItem(AUTO_SAVE_KEY) ?? "{}");
    const last = timers[documentId];
    if (!last) return true;
    return Date.now() - new Date(last).getTime() > 5 * 60 * 1000;
  } catch {
    return true;
  }
}

export function markAutoSaved(documentId: string): void {
  try {
    const timers = JSON.parse(localStorage.getItem(AUTO_SAVE_KEY) ?? "{}");
    timers[documentId] = new Date().toISOString();
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(timers));
  } catch {
    // ignore
  }
}

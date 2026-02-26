// ── File Upload Types ──

export const SUPPORTED_FILE_EXTENSIONS = [
  // Documents
  "pdf", "docx", "doc", "txt", "pptx", "ppt", "html", "csv",
  "xlsx", "xls", "xlsm", "json", "xml", "md", "rtf", "odt", "ods", "odp", "epub",
  // Images
  "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico",
  // Media
  "mp3", "mp4", "wav", "webm", "ogg",
  // Archives
  "zip", "gz", "tar",
  // Generic
  "file",
] as const;

export type SupportedFileExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];

export const SUPPORTED_MIME_TYPES: Record<string, SupportedFileExtension[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/msword": ["doc"],
  "text/plain": ["txt"],
  "text/csv": ["csv"],
  "text/html": ["html"],
  "text/markdown": ["md"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-excel": ["xls"],
  "application/json": ["json"],
  "application/xml": ["xml"],
  "application/epub+zip": ["epub"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/gif": ["gif"],
  "image/svg+xml": ["svg"],
  "image/webp": ["webp"],
  "audio/mpeg": ["mp3"],
  "video/mp4": ["mp4"],
  "audio/wav": ["wav"],
  "video/webm": ["webm"],
  "application/zip": ["zip"],
  "application/gzip": ["gz"],
};

/** 20 MB limit */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  filePath: string;
  publicUrl: string;
  fileType: string;
  fileSize: number;
}

/** File categories for icon/color display */
export type FileCategory = "document" | "image" | "media" | "data" | "archive" | "other";

export function getFileCategory(ext: string): FileCategory {
  if (["pdf", "docx", "doc", "txt", "pptx", "ppt", "html", "md", "rtf", "odt", "odp", "epub"].includes(ext)) return "document";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) return "image";
  if (["mp3", "mp4", "wav", "webm", "ogg"].includes(ext)) return "media";
  if (["csv", "xlsx", "xls", "xlsm", "json", "xml", "ods"].includes(ext)) return "data";
  if (["zip", "gz", "tar"].includes(ext)) return "archive";
  return "other";
}

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "file";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

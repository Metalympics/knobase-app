// Export service types

export type ExportFormat = "png" | "jpeg" | "pdf";

export type ExportScope = "full" | "section" | "selection";

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  documentId: string;
  userId: string;
  schoolId: string;
  
  // Optional scope parameters
  sectionId?: string;
  selectionStart?: number;
  selectionEnd?: number;
  
  // Branding options
  includeLogo?: boolean;
  includeAuthor?: boolean;
  includeTimestamp?: boolean;
  
  // Quality settings
  quality?: number; // 1-100 for jpeg, ignored for png/pdf
  scale?: number; // Device scale factor (1-3)
}

export interface ExportResult {
  success: boolean;
  url?: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: string;
  error?: string;
}

export interface ExportMetadata {
  documentTitle: string;
  authorName: string;
  schoolName: string;
  schoolLogo?: string;
  exportedAt: string;
  format: ExportFormat;
  scope: ExportScope;
}

export interface ExportTemplateData {
  content: string;
  metadata: ExportMetadata;
  styles: string;
}

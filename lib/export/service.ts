// Document export service using Playwright

import { chromium } from "playwright-core";
import type {
  ExportOptions,
  ExportResult,
  ExportMetadata,
  ExportTemplateData,
} from "./types";
import { generateExportHTML, getBaseStyles } from "./templates";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Export a document to image or PDF
 */
export async function exportDocument(
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Fetch document and metadata
    const metadata = await fetchExportMetadata(options);
    if (!metadata) {
      return {
        success: false,
        error: "Document not found or insufficient permissions",
      };
    }

    // Fetch document content
    const content = await fetchDocumentContent(options);
    if (!content) {
      return {
        success: false,
        error: "Failed to fetch document content",
      };
    }

    // Generate HTML
    const html = generateExportHTML({
      content,
      metadata,
      styles: getBaseStyles(),
    });

    // Launch browser and capture
    const buffer = await captureWithPlaywright(html, options);

    // Upload to Supabase Storage
    const uploadResult = await uploadToStorage(
      buffer,
      options,
      metadata.documentTitle
    );

    if (!uploadResult.success) {
      return uploadResult;
    }

    // Generate signed URL (24h expiry)
    const signedUrl = await generateSignedUrl(uploadResult.path!);

    return {
      success: true,
      url: signedUrl,
      fileName: uploadResult.fileName,
      fileSize: buffer.length,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error("Export error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

/**
 * Fetch document metadata for export
 */
async function fetchExportMetadata(
  options: ExportOptions
): Promise<ExportMetadata | null> {
  const supabase = await createServerClient();

  // Fetch document with school and author info
  const { data: doc, error } = await supabase
    .from("documents")
    .select(
      `
      id,
      title,
      school_id,
      created_by,
      schools:school_id (
        id,
        name,
        logo_url
      ),
      users:created_by (
        id,
        display_name
      )
    `
    )
    .eq("id", options.documentId)
    .eq("school_id", options.schoolId)
    .single();

  if (error || !doc) {
    return null;
  }

  const docData = doc as unknown as Record<string, any>;

  return {
    documentTitle: docData.title || "Untitled Document",
    authorName: docData.users?.display_name || "Unknown Author",
    schoolName: docData.schools?.name || "Unknown School",
    schoolLogo: options.includeLogo
      ? docData.schools?.logo_url || undefined
      : undefined,
    exportedAt: new Date().toISOString(),
    format: options.format,
    scope: options.scope,
  };
}

/**
 * Fetch document content based on scope
 */
async function fetchDocumentContent(
  options: ExportOptions
): Promise<string | null> {
  const supabase = await createServerClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("content")
    .eq("id", options.documentId)
    .single();

  if (error || !doc) {
    return null;
  }

  let content = doc.content || "";

  // Apply scope filtering
  if (options.scope === "section" && options.sectionId) {
    content = extractSection(content, options.sectionId);
  } else if (
    options.scope === "selection" &&
    options.selectionStart !== undefined &&
    options.selectionEnd !== undefined
  ) {
    content = content.substring(options.selectionStart, options.selectionEnd);
  }

  return content;
}

/**
 * Extract a specific section from content
 * This is a simplified implementation - you may need more sophisticated parsing
 */
function extractSection(content: string, sectionId: string): string {
  // Look for section by ID in HTML/Markdown
  const sectionRegex = new RegExp(
    `<[^>]*id="${sectionId}"[^>]*>([\\s\\S]*?)</[^>]*>`,
    "i"
  );
  const match = content.match(sectionRegex);
  return match ? match[1] : content;
}

/**
 * Capture HTML using Playwright
 */
async function captureWithPlaywright(
  html: string,
  options: ExportOptions
): Promise<Buffer> {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      deviceScaleFactor: options.scale || 2,
    });

    // Set content
    await page.setContent(html, { waitUntil: "networkidle" });

    // Wait for any images to load
    await page.waitForLoadState("networkidle");

    let buffer: Buffer;

    if (options.format === "pdf") {
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });
      buffer = Buffer.from(pdfBuffer);
    } else {
      // Generate screenshot (PNG or JPEG)
      const screenshotBuffer = await page.screenshot({
        type: options.format === "png" ? "png" : "jpeg",
        quality: options.format === "jpeg" ? options.quality || 90 : undefined,
        fullPage: true,
      });
      buffer = Buffer.from(screenshotBuffer);
    }

    return buffer;
  } finally {
    await browser.close();
  }
}

/**
 * Upload exported file to Supabase Storage
 */
async function uploadToStorage(
  buffer: Buffer,
  options: ExportOptions,
  documentTitle: string
): Promise<
  ExportResult & { path?: string; fileName?: string }
> {
  const supabase = await createServerClient();

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedTitle = documentTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `${sanitizedTitle}-${timestamp}.${options.format}`;
  const filePath = `${options.schoolId}/exports/${fileName}`;

  // Upload to storage bucket
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, buffer, {
      contentType:
        options.format === "pdf"
          ? "application/pdf"
          : options.format === "png"
            ? "image/png"
            : "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return {
      success: false,
      error: `Upload failed: ${uploadError.message}`,
    };
  }

  return {
    success: true,
    path: filePath,
    fileName,
  };
}

/**
 * Generate signed URL for storage file (24h expiry)
 */
async function generateSignedUrl(filePath: string): Promise<string> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 24 * 60 * 60); // 24 hours

  if (error || !data) {
    throw new Error("Failed to generate signed URL");
  }

  return data.signedUrl;
}

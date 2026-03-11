/**
 * Block-level operations for MCP document editing.
 * Operates on serialized HTML containing data-block-id attributes,
 * as produced by the TipTap BlockId extension.
 */

export type BlockOperationType =
  | "replace_block"
  | "insert_after_block"
  | "insert_before_block"
  | "append"
  | "prepend"
  | "delete_block";

export interface BlockOperation {
  type: BlockOperationType;
  block_id?: string;
  content?: string;
}

export interface ParsedBlock {
  id: string;
  tagName: string;
  /** Full outer HTML including the opening/closing tags. */
  outerHtml: string;
  /** Inner HTML between the opening and closing tags. */
  innerHtml: string;
  /** The complete opening tag string, e.g. `<p data-block-id="abc" class="x">`. */
  openingTag: string;
  /** Character offset of the block start within the source string. */
  startIndex: number;
  /** Character offset immediately after the block end. */
  endIndex: number;
}

export interface ParseBlocksResult {
  blocks: Map<string, ParsedBlock>;
  orderedBlocks: ParsedBlock[];
}

export interface BlockMutationResult {
  success: boolean;
  content: string;
  error?: string;
}

/**
 * Build a regex that finds the next block-id–bearing opening tag.
 * Captures: (1) tag name, (2) full attribute string, (3) block-id value.
 */
const OPEN_TAG_RE =
  /<([a-z][a-z0-9]*)((?:\s+[^>]*?)?\s+data-block-id=["']([^"']+)["'](?:\s+[^>]*?)?)>/gi;

/**
 * Walk forward from `startIdx` in `html` to find the matching close tag for
 * `tagName`, properly handling nested elements of the same tag name.
 * Returns the index of the character immediately after `</tagName>`,
 * or -1 if no match is found.
 */
function findMatchingCloseTag(
  html: string,
  tagName: string,
  startIdx: number,
): number {
  const lower = tagName.toLowerCase();
  const openPat = new RegExp(`<${lower}(?:\\s|>)`, "gi");
  const closePat = new RegExp(`</${lower}\\s*>`, "gi");

  openPat.lastIndex = startIdx;
  closePat.lastIndex = startIdx;

  let depth = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const closeMatch = closePat.exec(html);
    if (!closeMatch) return -1;

    // Count any opens between our current position and this close
    while (true) {
      const openMatch = openPat.exec(html);
      if (!openMatch || openMatch.index >= closeMatch.index) break;
      depth++;
    }

    depth--;
    if (depth === 0) {
      return closeMatch.index + closeMatch[0].length;
    }

    openPat.lastIndex = closeMatch.index + closeMatch[0].length;
  }
}

/**
 * Parse HTML content and extract all top-level blocks bearing `data-block-id`.
 *
 * Correctly handles nested elements of the same tag name by counting open/close
 * tag depth rather than relying on a non-greedy regex.
 */
export function parseBlocks(content: string): ParseBlocksResult {
  const blocks = new Map<string, ParsedBlock>();
  const orderedBlocks: ParsedBlock[] = [];

  OPEN_TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = OPEN_TAG_RE.exec(content)) !== null) {
    const [fullOpenTag, tagName, , blockId] = match;
    const startIndex = match.index;
    const innerStart = startIndex + fullOpenTag.length;

    const endIndex = findMatchingCloseTag(content, tagName, innerStart);
    if (endIndex === -1) continue; // malformed HTML — skip

    const outerHtml = content.substring(startIndex, endIndex);
    const closingTag = `</${tagName.toLowerCase()}>`;
    const innerHtml = content.substring(
      innerStart,
      endIndex - closingTag.length,
    );

    const block: ParsedBlock = {
      id: blockId,
      tagName: tagName.toLowerCase(),
      outerHtml,
      innerHtml,
      openingTag: fullOpenTag,
      startIndex,
      endIndex,
    };

    blocks.set(blockId, block);
    orderedBlocks.push(block);

    OPEN_TAG_RE.lastIndex = endIndex;
  }

  return { blocks, orderedBlocks };
}

/**
 * Find a single block by its `data-block-id` value.
 * Returns `null` when no block with the given ID exists.
 */
export function findBlock(
  content: string,
  blockId: string,
): ParsedBlock | null {
  const { blocks } = parseBlocks(content);
  return blocks.get(blockId) ?? null;
}

/**
 * Replace the **inner** content of a block, preserving the original opening
 * tag (and therefore all its attributes such as classes or styles).
 */
export function replaceBlock(
  content: string,
  blockId: string,
  newContent: string,
): BlockMutationResult {
  const block = findBlock(content, blockId);
  if (!block) {
    return {
      success: false,
      content,
      error: `Block with id "${blockId}" not found`,
    };
  }

  const closingTag = `</${block.tagName}>`;
  const newOuterHtml = `${block.openingTag}${newContent}${closingTag}`;

  const updatedContent =
    content.substring(0, block.startIndex) +
    newOuterHtml +
    content.substring(block.endIndex);

  return { success: true, content: updatedContent };
}

/**
 * Insert new HTML immediately after the identified block.
 */
export function insertAfterBlock(
  content: string,
  blockId: string,
  newBlockHtml: string,
): BlockMutationResult {
  const block = findBlock(content, blockId);
  if (!block) {
    return {
      success: false,
      content,
      error: `Block with id "${blockId}" not found`,
    };
  }

  const updatedContent =
    content.substring(0, block.endIndex) +
    newBlockHtml +
    content.substring(block.endIndex);

  return { success: true, content: updatedContent };
}

/**
 * Insert new HTML immediately before the identified block.
 */
export function insertBeforeBlock(
  content: string,
  blockId: string,
  newBlockHtml: string,
): BlockMutationResult {
  const block = findBlock(content, blockId);
  if (!block) {
    return {
      success: false,
      content,
      error: `Block with id "${blockId}" not found`,
    };
  }

  const updatedContent =
    content.substring(0, block.startIndex) +
    newBlockHtml +
    content.substring(block.startIndex);

  return { success: true, content: updatedContent };
}

/**
 * Append HTML to the end of the document.
 */
export function appendContent(
  content: string,
  newBlockHtml: string,
): BlockMutationResult {
  const trimmed = content.trimEnd();
  const separator = trimmed.length > 0 ? "\n" : "";
  return { success: true, content: trimmed + separator + newBlockHtml };
}

/**
 * Prepend HTML to the beginning of the document.
 */
export function prependContent(
  content: string,
  newBlockHtml: string,
): BlockMutationResult {
  const trimmed = content.trimStart();
  const separator = trimmed.length > 0 ? "\n" : "";
  return { success: true, content: newBlockHtml + separator + trimmed };
}

/**
 * Remove a block from the document. Collapses adjacent whitespace left behind.
 */
export function deleteBlock(
  content: string,
  blockId: string,
): BlockMutationResult {
  const block = findBlock(content, blockId);
  if (!block) {
    return {
      success: false,
      content,
      error: `Block with id "${blockId}" not found`,
    };
  }

  const before = content.substring(0, block.startIndex);
  const after = content.substring(block.endIndex);

  // Collapse runs of blank lines at the join point into a single newline.
  const trimmedBefore = before.replace(/\s+$/, "");
  const trimmedAfter = after.replace(/^\s+/, "");

  const separator =
    trimmedBefore.length > 0 && trimmedAfter.length > 0 ? "\n" : "";

  return {
    success: true,
    content: trimmedBefore + separator + trimmedAfter,
  };
}

/**
 * Apply a single {@link BlockOperation} to the content.
 */
export function applyOperation(
  content: string,
  operation: BlockOperation,
): BlockMutationResult {
  switch (operation.type) {
    case "replace_block": {
      if (!operation.block_id) {
        return {
          success: false,
          content,
          error: "replace_block requires block_id",
        };
      }
      if (operation.content === undefined) {
        return {
          success: false,
          content,
          error: "replace_block requires content",
        };
      }
      return replaceBlock(content, operation.block_id, operation.content);
    }

    case "insert_after_block": {
      if (!operation.block_id) {
        return {
          success: false,
          content,
          error: "insert_after_block requires block_id",
        };
      }
      if (operation.content === undefined) {
        return {
          success: false,
          content,
          error: "insert_after_block requires content",
        };
      }
      return insertAfterBlock(content, operation.block_id, operation.content);
    }

    case "insert_before_block": {
      if (!operation.block_id) {
        return {
          success: false,
          content,
          error: "insert_before_block requires block_id",
        };
      }
      if (operation.content === undefined) {
        return {
          success: false,
          content,
          error: "insert_before_block requires content",
        };
      }
      return insertBeforeBlock(content, operation.block_id, operation.content);
    }

    case "append": {
      if (operation.content === undefined) {
        return { success: false, content, error: "append requires content" };
      }
      return appendContent(content, operation.content);
    }

    case "prepend": {
      if (operation.content === undefined) {
        return { success: false, content, error: "prepend requires content" };
      }
      return prependContent(content, operation.content);
    }

    case "delete_block": {
      if (!operation.block_id) {
        return {
          success: false,
          content,
          error: "delete_block requires block_id",
        };
      }
      return deleteBlock(content, operation.block_id);
    }

    default:
      return {
        success: false,
        content,
        error: `Unknown operation type: ${(operation as BlockOperation).type}`,
      };
  }
}

/**
 * Apply multiple operations atomically — if any single operation fails the
 * original content is returned unchanged.
 */
export function applyOperations(
  content: string,
  operations: BlockOperation[],
): BlockMutationResult {
  if (!operations || operations.length === 0) {
    return { success: true, content };
  }

  let currentContent = content;

  for (let i = 0; i < operations.length; i++) {
    const result = applyOperation(currentContent, operations[i]);
    if (!result.success) {
      return {
        success: false,
        content,
        error: `Operation ${i + 1} (${operations[i].type}) failed: ${result.error}`,
      };
    }
    currentContent = result.content;
  }

  return { success: true, content: currentContent };
}

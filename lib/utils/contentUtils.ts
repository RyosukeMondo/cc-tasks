/**
 * Content sanitization and formatting utilities for conversation display
 * Provides XSS prevention, safe content processing, and formatting utilities
 */

/**
 * Error types for content processing operations
 */
export class ContentSecurityError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'ContentSecurityError';
  }
}

export class ContentFormatError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'ContentFormatError';
  }
}

/**
 * Maximum content length to prevent memory exhaustion
 */
const MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB

/**
 * HTML entities for XSS prevention
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Dangerous HTML tags and attributes to sanitize
 */
const DANGEROUS_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 
  'button', 'select', 'textarea', 'link', 'meta', 'base'
];

const DANGEROUS_ATTRIBUTES = [
  'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onfocus',
  'onblur', 'onchange', 'onsubmit', 'onreset', 'onkeydown', 'onkeyup',
  'onkeypress', 'javascript:', 'vbscript:', 'data:', 'href', 'src'
];

/**
 * Code block patterns for detection and formatting
 */
const CODE_BLOCK_PATTERNS = {
  fenced: /^```(\w*)\n([\s\S]*?)```$/gm,
  inline: /`([^`]+)`/g,
  indented: /^( {4}|\t)(.+)$/gm
};

/**
 * Markdown patterns for safe formatting
 */
const MARKDOWN_PATTERNS = {
  bold: /\*\*(.*?)\*\*/g,
  italic: /\*(.*?)\*/g,
  strikethrough: /~~(.*?)~~/g,
  link: /\[([^\]]+)\]\(([^)]+)\)/g,
  header: /^(#{1,6})\s+(.+)$/gm,
  listItem: /^[\s]*[-*+]\s+(.+)$/gm,
  numberedList: /^[\s]*\d+\.\s+(.+)$/gm
};

/**
 * Escapes HTML entities to prevent XSS attacks
 * @param text - Text to escape
 * @returns Escaped text safe for HTML display
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    throw new ContentSecurityError('Input must be a string');
  }

  return text.replace(/[&<>"'`=/]/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Validates content length to prevent memory exhaustion
 * @param content - Content to validate
 * @throws ContentSecurityError if content exceeds maximum length
 */
export function validateContentLength(content: string): void {
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new ContentSecurityError(
      `Content length ${content.length} exceeds maximum allowed length ${MAX_CONTENT_LENGTH}`
    );
  }
}

/**
 * Removes dangerous HTML tags and attributes
 * @param content - Content to sanitize
 * @returns Sanitized content with dangerous elements removed
 */
export function removeDangerousElements(content: string): string {
  let sanitized = content;

  // Remove dangerous HTML tags (case-insensitive)
  DANGEROUS_TAGS.forEach(tag => {
    const tagPattern = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
    sanitized = sanitized.replace(tagPattern, '');
  });

  // Remove dangerous attributes
  DANGEROUS_ATTRIBUTES.forEach(attr => {
    const attrPattern = new RegExp(`\\s+${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(attrPattern, '');
  });

  return sanitized;
}

/**
 * Detects and preserves code blocks with proper formatting
 * @param content - Content to process
 * @returns Object with code blocks extracted and content with placeholders
 */
export function extractCodeBlocks(content: string): {
  content: string;
  codeBlocks: Array<{ id: string; language: string; code: string; type: 'fenced' | 'inline' | 'indented' }>;
} {
  const codeBlocks: Array<{ id: string; language: string; code: string; type: 'fenced' | 'inline' | 'indented' }> = [];
  let processedContent = content;

  // Extract fenced code blocks
  processedContent = processedContent.replace(CODE_BLOCK_PATTERNS.fenced, (match, language, code) => {
    const id = `CODE_BLOCK_${codeBlocks.length}`;
    codeBlocks.push({
      id,
      language: language || 'text',
      code: code.trim(),
      type: 'fenced'
    });
    return `{{${id}}}`;
  });

  // Extract inline code
  processedContent = processedContent.replace(CODE_BLOCK_PATTERNS.inline, (match, code) => {
    const id = `CODE_BLOCK_${codeBlocks.length}`;
    codeBlocks.push({
      id,
      language: 'text',
      code,
      type: 'inline'
    });
    return `{{${id}}}`;
  });

  return { content: processedContent, codeBlocks };
}

/**
 * Restores code blocks with safe formatting
 * @param content - Content with code block placeholders
 * @param codeBlocks - Array of code blocks to restore
 * @returns Content with code blocks restored and safely formatted
 */
export function restoreCodeBlocks(
  content: string, 
  codeBlocks: Array<{ id: string; language: string; code: string; type: 'fenced' | 'inline' | 'indented' }>
): string {
  let restoredContent = content;

  codeBlocks.forEach(block => {
    const placeholder = `{{${block.id}}}`;
    const escapedCode = escapeHtml(block.code);
    
    let formattedBlock: string;
    if (block.type === 'inline') {
      formattedBlock = `<code class="inline-code">${escapedCode}</code>`;
    } else {
      formattedBlock = `<pre class="code-block" data-language="${escapeHtml(block.language)}"><code>${escapedCode}</code></pre>`;
    }
    
    restoredContent = restoredContent.replace(placeholder, formattedBlock);
  });

  return restoredContent;
}

/**
 * Processes markdown formatting safely
 * @param content - Content to process
 * @returns Content with safe markdown formatting applied
 */
export function processMarkdownFormatting(content: string): string {
  let formatted = content;

  // Process headers
  formatted = formatted.replace(MARKDOWN_PATTERNS.header, (match, hashes, text) => {
    const level = Math.min(hashes.length, 6);
    const escapedText = escapeHtml(text.trim());
    return `<h${level} class="markdown-h${level}">${escapedText}</h${level}>`;
  });

  // Process bold text
  formatted = formatted.replace(MARKDOWN_PATTERNS.bold, (match, text) => {
    return `<strong class="markdown-bold">${escapeHtml(text)}</strong>`;
  });

  // Process italic text
  formatted = formatted.replace(MARKDOWN_PATTERNS.italic, (match, text) => {
    return `<em class="markdown-italic">${escapeHtml(text)}</em>`;
  });

  // Process strikethrough
  formatted = formatted.replace(MARKDOWN_PATTERNS.strikethrough, (match, text) => {
    return `<del class="markdown-strikethrough">${escapeHtml(text)}</del>`;
  });

  // Process links (with security validation)
  formatted = formatted.replace(MARKDOWN_PATTERNS.link, (match, linkText, url) => {
    const safeUrl = sanitizeUrl(url);
    const escapedText = escapeHtml(linkText);
    if (safeUrl) {
      return `<a href="${escapeHtml(safeUrl)}" class="markdown-link" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;
    }
    return escapedText; // Return just the text if URL is unsafe
  });

  // Process list items
  formatted = formatted.replace(MARKDOWN_PATTERNS.listItem, (match, text) => {
    return `<li class="markdown-list-item">${escapeHtml(text)}</li>`;
  });

  // Process numbered list items
  formatted = formatted.replace(MARKDOWN_PATTERNS.numberedList, (match, text) => {
    return `<li class="markdown-numbered-item">${escapeHtml(text)}</li>`;
  });

  return formatted;
}

/**
 * Sanitizes URLs to prevent XSS through href attributes
 * @param url - URL to sanitize
 * @returns Sanitized URL or null if unsafe
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:', 'ftp:'];
  if (dangerousProtocols.some(protocol => trimmedUrl.startsWith(protocol))) {
    return null;
  }

  // Allow only safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:'];
  const hasProtocol = safeProtocols.some(protocol => trimmedUrl.startsWith(protocol));
  
  if (!hasProtocol && !trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('#')) {
    // Relative URLs without protocol - prepend https://
    return `https://${url.trim()}`;
  }

  return hasProtocol || trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#') ? url.trim() : null;
}

/**
 * Formats conversation content for safe display
 * Combines all sanitization and formatting utilities
 * @param content - Raw conversation content
 * @param options - Formatting options
 * @returns Safely formatted content ready for display
 */
export function formatConversationContent(
  content: string,
  options: {
    preserveCodeBlocks?: boolean;
    enableMarkdown?: boolean;
    maxLength?: number;
  } = {}
): string {
  try {
    if (typeof content !== 'string') {
      throw new ContentFormatError('Content must be a string');
    }

    if (content.length === 0) {
      return '';
    }

    // Validate content length
    const maxLength = options.maxLength || MAX_CONTENT_LENGTH;
    if (content.length > maxLength) {
      throw new ContentSecurityError(`Content exceeds maximum length of ${maxLength} characters`);
    }

    let processedContent = content;

    // Extract code blocks if preservation is enabled
    let codeBlocks: Array<{ id: string; language: string; code: string; type: 'fenced' | 'inline' | 'indented' }> = [];
    if (options.preserveCodeBlocks !== false) {
      const extracted = extractCodeBlocks(processedContent);
      processedContent = extracted.content;
      codeBlocks = extracted.codeBlocks;
    }

    // Remove dangerous HTML elements
    processedContent = removeDangerousElements(processedContent);

    // Process markdown if enabled
    if (options.enableMarkdown !== false) {
      processedContent = processMarkdownFormatting(processedContent);
    } else {
      // If markdown is disabled, just escape HTML
      processedContent = escapeHtml(processedContent);
    }

    // Restore code blocks with safe formatting
    if (options.preserveCodeBlocks !== false && codeBlocks.length > 0) {
      processedContent = restoreCodeBlocks(processedContent, codeBlocks);
    }

    // Convert line breaks to HTML breaks for proper display
    processedContent = processedContent.replace(/\n/g, '<br>');

    return processedContent;

  } catch (error) {
    if (error instanceof ContentSecurityError || error instanceof ContentFormatError) {
      throw error;
    }
    throw new ContentFormatError(
      'Failed to format conversation content',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Sanitizes tool parameters for safe display
 * @param parameters - Tool parameters object
 * @returns Safely formatted parameters as JSON string
 */
export function formatToolParameters(parameters: Record<string, unknown>): string {
  try {
    if (!parameters || typeof parameters !== 'object') {
      return '{}';
    }

    // Convert to JSON and then escape for safe display
    const jsonString = JSON.stringify(parameters, null, 2);
    return escapeHtml(jsonString);
  } catch (error) {
    console.warn("Failed to format tool parameters:", error);
    return escapeHtml('{"error": "Invalid parameters"}');
  }
}

/**
 * Truncates content to a specified length with ellipsis
 * @param content - Content to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated content with ellipsis if needed
 */
export function truncateContent(content: string, maxLength: number = 500): string {
  if (typeof content !== 'string') {
    return '';
  }

  if (content.length <= maxLength) {
    return content;
  }

  return content.substring(0, maxLength).trim() + '...';
}

/**
 * Validates that content is safe for display
 * @param content - Content to validate
 * @returns True if content passes security validation
 */
export function validateContentSecurity(content: string): boolean {
  try {
    if (typeof content !== 'string') {
      return false;
    }

    validateContentLength(content);

    // Check for obvious XSS attempts
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /onload\s*=/i,
      /onerror\s*=/i,
      /onclick\s*=/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  } catch {
    return false;
  }
}


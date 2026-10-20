/**
 * @file security.ts
 * @description Pure security utilities for EventPulse AI.
 * Sanitizes user input to prevent prompt-injection attacks before
 * any content reaches the Gemini API.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum character length accepted from any single user-supplied field. */
const MAX_INPUT_LENGTH = 2_000;

/**
 * Patterns that represent known prompt-injection vectors.
 * Each entry is a case-insensitive regex that strips the matching segment.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Role / persona hijack keywords
  /\bsystem\s*:/gi,
  /\bdeveloper\s*:/gi,
  /\buser\s*:/gi,
  /\bassistant\s*:/gi,
  /\bai\s*:/gi,

  // Llama-style instruction tags
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<\/SYS>/gi,

  // XML / HTML that could escape our own sandboxing tags
  /<\/?user_input[^>]*>/gi,
  /<\/?system[^>]*>/gi,
  /<\/?prompt[^>]*>/gi,
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<[^>]+>/g,

  // Markdown / text role separators used in chat formats
  /###\s*system/gi,
  /###\s*human/gi,
  /###\s*assistant/gi,

  // Ignore-previous-instructions phrasing
  /ignore\s+(previous|all|prior)\s+instructions?/gi,
  /disregard\s+(previous|all|prior)\s+instructions?/gi,

  // Jailbreak token sequences
  /\bDAN\b/g,
  /\bDeveloperMode\b/gi,
  /\bJailbreak\b/gi,
];

// Control-character regex (everything below 0x20 except tab, LF, CR)
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sanitizes a raw user-supplied string by:
 *  1. Enforcing a character-length ceiling.
 *  2. Stripping ASCII control characters (excluding safe whitespace).
 *  3. Removing all known prompt-injection / role-hijack sequences.
 *  4. Collapsing excessive whitespace to keep the output tidy.
 *
 * @param input - Raw string from any user-facing field.
 * @returns A clean, injection-free string safe to embed in a Gemini prompt.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // 1. Hard length cap — slice before regex work to avoid catastrophic backtracking
  let sanitized = input.slice(0, MAX_INPUT_LENGTH);

  // 2. Replace control characters with a space (prevents adjacent words colliding)
  sanitized = sanitized.replace(CONTROL_CHARS, " ");

  // 3. Remove injection patterns iteratively (patterns can be nested/layered)
  let previous = "";
  let iterations = 0;
  const MAX_ITERATIONS = 5;
  while (previous !== sanitized && iterations < MAX_ITERATIONS) {
    previous = sanitized;
    for (const pattern of INJECTION_PATTERNS) {
      // Reset lastIndex for global regexes between uses
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, " ");
    }
    iterations++;
  }

  // 4. Collapse multiple consecutive whitespace characters into a single space
  sanitized = sanitized.replace(/\s{2,}/g, " ").trim();

  return sanitized;
}

/**
 * Wraps already-sanitized content in XML boundary tags that serve as a
 * hard delimiter, preventing any residual content from being interpreted
 * as model instructions inside the prompt.
 *
 * @param content - Pre-sanitized user content.
 * @returns XML-wrapped string ready for embedding in a system prompt.
 */
export function xmlWrap(content: string): string {
  return `<user_input>${content}</user_input>`;
}

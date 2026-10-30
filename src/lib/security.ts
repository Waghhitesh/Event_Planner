/**
 * @file security.ts
 * @description Pure security utilities for EventPulse AI.
 * Sanitizes user input to prevent prompt-injection attacks before
 * any content reaches the Gemini API.
 */

import { LIMITS } from "./config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Zero-width and bidirectional Unicode characters that can be used to
 * split keywords and evade pattern matching.
 * Strip these BEFORE applying injection pattern matching.
 */
const ZERO_WIDTH_AND_BIDI = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

/**
 * Patterns that represent known prompt-injection vectors.
 *
 * Design principles:
 *  - Role-prefix patterns (system:, developer:, user:, assistant:) match only
 *    at the START of a line (multiline ^ anchor) to avoid mangling benign
 *    text like "Sound system: 2 speakers" or "AI: robot theme".
 *  - Genuinely dangerous jailbreak tokens ([INST], <<SYS>>, ### system,
 *    ignore/disregard previous instructions) are stripped globally.
 *  - HTML/XML is stripped globally to prevent tag injection.
 *  - We do NOT strip \bDAN\b, \bai\s*:\b, or \bDeveloperMode\b as they
 *    cause too many false positives on legitimate event text.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Role prefixes at line start only (multiline, case-insensitive)
  /^\s*(system|developer|assistant|user)\s*:/gim,

  // Llama-style instruction tags
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<<\/SYS>>/gi,

  // Markdown chat role separators
  /###\s*system/gi,
  /###\s*human/gi,
  /###\s*assistant/gi,

  // Ignore/disregard-previous-instructions phrasing
  /ignore\s+(previous|all|prior)\s+instructions?/gi,
  /disregard\s+(previous|all|prior)\s+instructions?/gi,

  // Common jailbreak tokens
  /\bJailbreak\b/gi,

  // XML / HTML that could escape our own sandboxing tags
  /<\/?user_input[^>]*>/gi,
  /<\/?system[^>]*>/gi,
  /<\/?prompt[^>]*>/gi,
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
];

// Control-character regex (everything below 0x20 except tab \x09, LF \x0A, CR \x0D)
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// XML special characters for escaping in xmlWrap
const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sanitizes a raw user-supplied string by:
 *  1. Enforcing a character-length ceiling.
 *  2. NFKC Unicode normalisation (collapses fullwidth/halfwidth variants).
 *  3. Stripping zero-width and bidirectional Unicode characters.
 *  4. Stripping ASCII control characters (excluding safe whitespace).
 *  5. Removing all known prompt-injection / role-hijack sequences.
 *  6. Collapsing excessive whitespace.
 *
 * @param input - Raw string from any user-facing field.
 * @returns A clean, injection-free string safe to embed in a Gemini prompt.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // 1. Hard length cap — slice before heavy regex work
  let sanitized = input.slice(0, LIMITS.MAX_FIELD_LENGTH);

  // 2. NFKC normalisation: collapses ｓｙｓｔｅｍ → system, ＠ → @, etc.
  if (typeof sanitized.normalize === "function") {
    sanitized = sanitized.normalize("NFKC");
  }

  // 3. Strip zero-width and bidi characters
  sanitized = sanitized.replace(ZERO_WIDTH_AND_BIDI, "");

  // 4. Replace control characters with a space
  sanitized = sanitized.replace(CONTROL_CHARS, " ");

  // 5. Remove injection patterns iteratively (patterns can be nested/layered)
  let previous = "";
  let iterations = 0;
  const MAX_ITERATIONS = 5;
  while (previous !== sanitized && iterations < MAX_ITERATIONS) {
    previous = sanitized;
    for (const pattern of INJECTION_PATTERNS) {
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, " ");
    }
    iterations++;
  }

  // 6. Collapse multiple consecutive whitespace characters into a single space
  sanitized = sanitized.replace(/\s{2,}/g, " ").trim();

  return sanitized;
}

/**
 * XML-escapes special characters in content and wraps it in <user_input> tags.
 * Escaping ensures a lone `</user_input` fragment in user content cannot
 * prematurely close the tag and escape the XML boundary.
 *
 * @param content - Pre-sanitized user content.
 * @returns XML-escaped and wrapped string safe for embedding in a prompt.
 */
export function xmlWrap(content: string): string {
  const escaped = content.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch] ?? ch);
  return `<user_input>${escaped}</user_input>`;
}

/**
 * Strips ASCII control characters from an AI-generated output string.
 * Used to sanitize model responses before returning them to the client.
 *
 * @param value - A string from the AI model output.
 * @returns The string with control characters removed.
 */
export function sanitizeOutput(value: string): string {
  return value.replace(CONTROL_CHARS, "").replace(ZERO_WIDTH_AND_BIDI, "");
}

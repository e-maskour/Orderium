/**
 * Safety Filters
 * Detect and prevent prompt injection, data exfiltration, and code injection
 */

export class SafetyFilters {
  /**
   * Detect potential prompt injection attacks
   */
  static detectPromptInjection(userMessage: string): {
    safe: boolean;
    reason?: string;
  } {
    const injectionPatterns = [
      /ignore\s+(previous|all|above|prior)\s+(instructions|prompts|rules)/i,
      /you\s+are\s+(now|a)\s+[a-z]+/i, // "you are now a..."
      /forget\s+(everything|all|your\s+instructions)/i,
      /system\s*:/i, // Trying to inject system messages
      /assistant\s*:/i,
      /<\|im_start\|>/i, // Special tokens
      /<\|im_end\|>/i,
      /\[INST\]/i,
      /\[\/INST\]/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(userMessage)) {
        return {
          safe: false,
          reason: 'Potential prompt injection detected',
        };
      }
    }

    return { safe: true };
  }

  /**
   * Sanitize user input before sending to Ollama
   */
  static sanitizeInput(input: string): string {
    // Remove special characters that could break message format
    let sanitized = input
      .replace(/<\|.*?\|>/g, '') // Remove special tokens
      .replace(/\[INST\]|\[\/INST\]/g, '')
      .trim();

    // Limit length
    if (sanitized.length > 4000) {
      sanitized = sanitized.substring(0, 4000) + '... (truncated)';
    }

    return sanitized;
  }

  /**
   * Validate tool call parameters don't contain malicious code
   */
  static validateToolParams(params: any): { safe: boolean; reason?: string } {
    const serialized = JSON.stringify(params);

    // Check for code execution attempts
    const codePatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers like onclick=
    ];

    for (const pattern of codePatterns) {
      if (pattern.test(serialized)) {
        return {
          safe: false,
          reason: 'Potential code injection in parameters',
        };
      }
    }

    return { safe: true };
  }

  /**
   * Prevent data exfiltration via tool parameters
   */
  static checkDataExfiltration(params: any): { safe: boolean; reason?: string } {
    const serialized = JSON.stringify(params);

    // Check for external URLs
    const urlPattern = /(https?:\/\/(?!localhost|127\.0\.0\.1)[^\s]+)/gi;
    const matches = serialized.match(urlPattern);

    if (matches && matches.length > 0) {
      return {
        safe: false,
        reason: 'External URLs not allowed in parameters',
      };
    }

    return { safe: true };
  }
}

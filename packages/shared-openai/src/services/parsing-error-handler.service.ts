import {
  OpenAIResponse,
  ParsingDiagnostics,
  OutputTextParsingError
} from '../interfaces/output-parser.interface';

/**
 * Parsing Error Handler Service
 * Provides comprehensive error handling for response parsing failures
 * Requirements: 1.3, 1.4
 */
export class ParsingErrorHandlerService {
  private readonly logger: (level: string, message: string, data?: any) => void;
  private parsingFailureCount = 0;
  private totalParsingAttempts = 0;

  constructor(logger?: (level: string, message: string, data?: any) => void) {
    this.logger = logger || ((level: string, message: string, data?: any) => {
      console.log(`[${level.toUpperCase()}] [ParsingErrorHandler] ${message}`, data || '');
    });
  }

  /**
   * Handle parsing errors with detailed diagnostics and fallback strategies
   * Requirement 1.3: Implement descriptive error messages including response status and output types
   */
  handleParsingError(
    error: OutputTextParsingError,
    context: string = 'unknown'
  ): never {
    this.parsingFailureCount++;
    this.totalParsingAttempts++;

    const errorDetails = this.createDetailedErrorMessage(error, context);
    
    // Log comprehensive error information
    this.logger('error', 'OpenAI response parsing failed', {
      context,
      errorMessage: error.message,
      diagnostics: error.diagnostics,
      failureRate: this.getFailureRate(),
      responsePreview: this.getResponsePreview(error.originalResponse)
    });

    // Create enhanced error with additional context
    const enhancedError = new OutputTextParsingError(
      errorDetails,
      error.diagnostics,
      error.originalResponse
    );

    throw enhancedError;
  }

  /**
   * Handle parsing warnings and edge cases
   * Requirement 1.4: Create diagnostic logging for parsing failures and edge cases
   */
  handleParsingWarning(
    diagnostics: ParsingDiagnostics,
    context: string = 'unknown'
  ): void {
    if (diagnostics.warnings.length === 0) return;

    this.logger('warn', 'OpenAI response parsing warnings detected', {
      context,
      warnings: diagnostics.warnings,
      extractionMethod: diagnostics.extractionMethod,
      responseStatus: diagnostics.responseStatus,
      outputTypes: diagnostics.outputTypes
    });

    // Track warning patterns for monitoring
    this.trackWarningPatterns(diagnostics);
  }

  /**
   * Attempt fallback parsing strategies for different response format variations
   */
  attemptFallbackStrategies(
    response: OpenAIResponse,
    originalError: OutputTextParsingError
  ): string | null {
    this.logger('info', 'Attempting fallback parsing strategies', {
      originalMethod: originalError.diagnostics.extractionMethod,
      responseStatus: response.status,
      outputTypes: originalError.diagnostics.outputTypes
    });

    // Strategy 1: Try to extract from reasoning output if available
    const reasoningResult = this.tryExtractFromReasoning(response);
    if (reasoningResult) {
      this.logger('info', 'Successfully extracted text using reasoning fallback');
      return reasoningResult;
    }

    // Strategy 2: Try to extract from any text-like content
    const textLikeResult = this.tryExtractFromTextLikeContent(response);
    if (textLikeResult) {
      this.logger('info', 'Successfully extracted text using text-like content fallback');
      return textLikeResult;
    }

    // Strategy 3: Try to parse JSON content that might contain text
    const jsonResult = this.tryExtractFromJsonContent(response);
    if (jsonResult) {
      this.logger('info', 'Successfully extracted text using JSON content fallback');
      return jsonResult;
    }

    this.logger('error', 'All fallback parsing strategies failed');
    return null;
  }

  /**
   * Create detailed error message for debugging
   */
  private createDetailedErrorMessage(
    error: OutputTextParsingError,
    context: string
  ): string {
    const diagnostics = error.diagnostics;
    
    const parts = [
      `OpenAI response parsing failed in context: ${context}`,
      `Status: ${diagnostics.responseStatus}`,
      `Available output types: [${diagnostics.outputTypes.join(', ')}]`,
      `Has output_text field: ${diagnostics.hasOutputText}`,
      `Has message content: ${diagnostics.hasMessageContent}`,
      `Total content length: ${diagnostics.contentLength} characters`,
      `Attempted extraction method: ${diagnostics.extractionMethod}`
    ];

    if (diagnostics.warnings.length > 0) {
      parts.push(`Warnings encountered: ${diagnostics.warnings.join('; ')}`);
    }

    if (diagnostics.errors.length > 0) {
      parts.push(`Errors encountered: ${diagnostics.errors.join('; ')}`);
    }

    // Add failure rate context
    parts.push(`Current parsing failure rate: ${this.getFailureRate().toFixed(2)}%`);

    return parts.join(' | ');
  }

  /**
   * Get a safe preview of the response for logging
   */
  private getResponsePreview(response?: OpenAIResponse): any {
    if (!response) return null;

    return {
      status: response.status,
      outputCount: response.output?.length || 0,
      outputTypes: response.output?.map(item => item.type) || [],
      hasUsage: !!response.usage,
      incompleteReason: response.incomplete_details?.reason
    };
  }

  /**
   * Track warning patterns for monitoring and alerting
   */
  private trackWarningPatterns(diagnostics: ParsingDiagnostics): void {
    // Track common warning patterns
    const warningPatterns = {
      missingOutputText: diagnostics.warnings.some(w => w.includes('output_text')),
      incompleteResponse: diagnostics.warnings.some(w => w.includes('incomplete')),
      fallbackUsed: diagnostics.extractionMethod !== 'output_text',
      emptyContent: diagnostics.contentLength === 0
    };

    this.logger('debug', 'Warning patterns detected', warningPatterns);
  }

  /**
   * Try to extract text from reasoning output
   */
  private tryExtractFromReasoning(response: OpenAIResponse): string | null {
    if (!response.output) return null;

    const reasoningItem = response.output.find(item => item.type === 'reasoning');
    if (!reasoningItem || !reasoningItem.content) return null;

    const textContent = reasoningItem.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join(' ')
      .trim();

    return textContent.length > 10 ? textContent : null;
  }

  /**
   * Try to extract from any content that looks like text
   */
  private tryExtractFromTextLikeContent(response: OpenAIResponse): string | null {
    if (!response.output) return null;

    const textParts: string[] = [];

    for (const item of response.output) {
      // Check direct text field
      if (item.text && typeof item.text === 'string' && item.text.trim().length > 0) {
        textParts.push(item.text.trim());
      }

      // Check content array
      if (item.content && Array.isArray(item.content)) {
        for (const contentItem of item.content) {
          if (contentItem.text && typeof contentItem.text === 'string' && contentItem.text.trim().length > 0) {
            textParts.push(contentItem.text.trim());
          }
        }
      }
    }

    const combinedText = textParts.join(' ').trim();
    return combinedText.length > 10 ? combinedText : null;
  }

  /**
   * Try to extract text from JSON content
   */
  private tryExtractFromJsonContent(response: OpenAIResponse): string | null {
    if (!response.output) return null;

    for (const item of response.output) {
      if (item.content) {
        for (const contentItem of item.content) {
          if (contentItem.text) {
            try {
              const parsed = JSON.parse(contentItem.text);
              
              // Look for common text fields in JSON
              const textFields = ['text', 'content', 'message', 'response', 'result'];
              
              for (const field of textFields) {
                if (parsed[field] && typeof parsed[field] === 'string' && parsed[field].trim().length > 10) {
                  return parsed[field].trim();
                }
              }
            } catch {
              // Not valid JSON, continue
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Get current parsing failure rate
   */
  getFailureRate(): number {
    if (this.totalParsingAttempts === 0) return 0;
    return (this.parsingFailureCount / this.totalParsingAttempts) * 100;
  }

  /**
   * Get parsing statistics for monitoring
   */
  getParsingStats(): {
    totalAttempts: number;
    failures: number;
    failureRate: number;
    successRate: number;
  } {
    const successCount = this.totalParsingAttempts - this.parsingFailureCount;
    
    return {
      totalAttempts: this.totalParsingAttempts,
      failures: this.parsingFailureCount,
      failureRate: this.getFailureRate(),
      successRate: this.totalParsingAttempts > 0 ? (successCount / this.totalParsingAttempts) * 100 : 0
    };
  }

  /**
   * Reset statistics (useful for testing or periodic resets)
   */
  resetStats(): void {
    this.parsingFailureCount = 0;
    this.totalParsingAttempts = 0;
  }

  /**
   * Record successful parsing attempt
   */
  recordSuccessfulParsing(): void {
    this.totalParsingAttempts++;
  }

  /**
   * Check if failure rate exceeds threshold for alerting
   */
  shouldAlert(threshold: number = 10): boolean {
    return this.totalParsingAttempts >= 10 && this.getFailureRate() > threshold;
  }
}
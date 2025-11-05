import {
  IOutputTextParser,
  OpenAIResponse,
  OutputItem,
  ContentItem,
  ParsingDiagnostics,
  ParsingResult,
  OutputTextParsingError
} from '../interfaces/output-parser.interface';
import { ParsingErrorHandlerService } from './parsing-error-handler.service';

/**
 * Output Text Parser Service
 * Implements robust text extraction using output_text field with fallback parsing
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export class OutputTextParserService implements IOutputTextParser {
  private readonly logger: (message: string, data?: any) => void;
  private readonly errorHandler: ParsingErrorHandlerService;

  constructor(logger?: (message: string, data?: any) => void) {
    this.logger = logger || ((message: string, data?: any) => {
      console.log(`[OutputTextParser] ${message}`, data || '');
    });

    // Initialize error handler with enhanced logging
    this.errorHandler = new ParsingErrorHandlerService((level: string, message: string, data?: any) => {
      this.logger(`[${level.toUpperCase()}] ${message}`, data);
    });
  }

  /**
   * Extract text from OpenAI response using primary output_text field with fallback
   * Requirement 1.1: Use output_text field as primary method
   * Requirement 1.2: Fall back to parsing message.content arrays when output_text is missing
   */
  async extractText(response: OpenAIResponse): Promise<string> {
    const result = this.extractTextWithDiagnostics(response);
    
    if (!result.success) {
      const error = new OutputTextParsingError(
        `Failed to extract text: ${result.diagnostics.errors.join(', ')}`,
        result.diagnostics,
        response
      );

      // Try fallback strategies before throwing
      const fallbackText = this.errorHandler.attemptFallbackStrategies(response, error);
      if (fallbackText && this.validateText(fallbackText)) {
        this.errorHandler.recordSuccessfulParsing();
        return fallbackText;
      }

      // All strategies failed, handle the error
      this.errorHandler.handleParsingError(error, 'text_extraction');
    }

    // Handle any warnings
    this.errorHandler.handleParsingWarning(result.diagnostics, 'text_extraction');
    this.errorHandler.recordSuccessfulParsing();

    return result.text;
  }

  /**
   * Extract text with comprehensive diagnostics
   */
  extractTextWithDiagnostics(response: OpenAIResponse): ParsingResult {
    const diagnostics = this.getDiagnostics(response);
    
    // Requirement 1.4: Throw descriptive errors including response status and output types
    if (!response.output || !Array.isArray(response.output)) {
      diagnostics.errors.push('No output array in OpenAI response');
      return {
        text: '',
        diagnostics,
        success: false
      };
    }

    // Strategy 1: Try to extract from output_text field (primary method)
    const outputTextResult = this.tryExtractFromOutputText(response.output, diagnostics);
    if (outputTextResult) {
      diagnostics.extractionMethod = 'output_text';
      return {
        text: outputTextResult,
        diagnostics,
        success: true
      };
    }

    // Strategy 2: Fall back to message.content arrays
    const messageContentResult = this.tryExtractFromMessageContent(response.output, diagnostics);
    if (messageContentResult) {
      diagnostics.extractionMethod = 'message_content';
      diagnostics.warnings.push('Used fallback message.content parsing - output_text was empty or missing');
      return {
        text: messageContentResult,
        diagnostics,
        success: true
      };
    }

    // Strategy 3: Try other content types as last resort
    const fallbackResult = this.tryExtractFromFallback(response.output, diagnostics);
    if (fallbackResult) {
      diagnostics.extractionMethod = 'fallback';
      diagnostics.warnings.push('Used fallback extraction from non-standard content types');
      return {
        text: fallbackResult,
        diagnostics,
        success: true
      };
    }

    // All strategies failed
    diagnostics.extractionMethod = 'failed';
    diagnostics.errors.push('All text extraction strategies failed');
    
    return {
      text: '',
      diagnostics,
      success: false
    };
  }

  /**
   * Validate extracted text content
   * Requirement 1.5: Validate that extracted text is non-empty before proceeding
   */
  validateText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();
    
    // Must be non-empty after trimming
    if (trimmed.length === 0) {
      return false;
    }

    // Must contain actual content (not just whitespace or special characters)
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      return false;
    }

    // Must be reasonable length (not just a single character)
    if (trimmed.length < 3) {
      return false;
    }

    return true;
  }

  /**
   * Generate comprehensive diagnostics for troubleshooting
   * Requirement 1.3: Provide detailed diagnostics when text extraction fails
   */
  getDiagnostics(response: OpenAIResponse): ParsingDiagnostics {
    const diagnostics: ParsingDiagnostics = {
      responseStatus: response.status || 'unknown',
      outputTypes: [],
      hasOutputText: false,
      hasMessageContent: false,
      contentLength: 0,
      extractionMethod: 'failed',
      warnings: [],
      errors: []
    };

    // Check response status
    if (response.status === 'incomplete') {
      diagnostics.warnings.push(`Incomplete response: ${response.incomplete_details?.reason || 'unknown reason'}`);
    }

    // Analyze output structure
    if (response.output && Array.isArray(response.output)) {
      diagnostics.outputTypes = response.output.map(item => item.type || 'unknown');
      
      // Check for output_text availability
      const outputTextItem = response.output.find(item => item.type === 'output_text');
      diagnostics.hasOutputText = !!(outputTextItem && outputTextItem.text);
      
      // Check for message content availability
      const messageItem = response.output.find(item => item.type === 'message');
      diagnostics.hasMessageContent = !!(messageItem && messageItem.content && messageItem.content.length > 0);
      
      // Calculate total content length
      diagnostics.contentLength = response.output.reduce((total, item) => {
        if (item.text) return total + item.text.length;
        if (item.content) {
          return total + item.content.reduce((subtotal, contentItem) => 
            subtotal + (contentItem.text?.length || 0), 0);
        }
        return total;
      }, 0);
    } else {
      diagnostics.errors.push('Response output is not an array or is missing');
    }

    return diagnostics;
  }

  /**
   * Primary extraction method: Try to get text from output_text field
   */
  private tryExtractFromOutputText(output: OutputItem[], diagnostics: ParsingDiagnostics): string | null {
    const outputTextItem = output.find(item => item.type === 'output_text');
    
    if (!outputTextItem) {
      diagnostics.warnings.push('No output_text item found in response');
      return null;
    }

    if (!outputTextItem.text) {
      diagnostics.warnings.push('output_text item exists but text field is empty');
      return null;
    }

    const text = outputTextItem.text.trim();
    
    if (!this.validateText(text)) {
      diagnostics.warnings.push('output_text field contains invalid or empty text');
      return null;
    }

    this.logger('Successfully extracted text from output_text field', {
      length: text.length,
      preview: text.substring(0, 80)
    });

    return text;
  }

  /**
   * Fallback extraction method: Parse message.content arrays
   */
  private tryExtractFromMessageContent(output: OutputItem[], diagnostics: ParsingDiagnostics): string | null {
    const messageItem = output.find(item => item.type === 'message');
    
    if (!messageItem) {
      diagnostics.warnings.push('No message item found in response');
      return null;
    }

    if (!messageItem.content || !Array.isArray(messageItem.content)) {
      diagnostics.warnings.push('Message item exists but content array is missing');
      return null;
    }

    // Extract text from all content items
    const textParts: string[] = [];
    
    for (const contentItem of messageItem.content) {
      if (contentItem.type === 'text' && contentItem.text) {
        textParts.push(contentItem.text);
      }
    }

    if (textParts.length === 0) {
      diagnostics.warnings.push('Message content array exists but contains no text items');
      return null;
    }

    const combinedText = textParts.join(' ').trim();
    
    if (!this.validateText(combinedText)) {
      diagnostics.warnings.push('Message content text is invalid or empty after combination');
      return null;
    }

    this.logger('Successfully extracted text from message.content fallback', {
      contentItems: textParts.length,
      length: combinedText.length,
      preview: combinedText.substring(0, 80)
    });

    return combinedText;
  }

  /**
   * Last resort: Try to extract from any available content
   */
  private tryExtractFromFallback(output: OutputItem[], diagnostics: ParsingDiagnostics): string | null {
    const textParts: string[] = [];

    for (const item of output) {
      // Try direct text field
      if (item.text && this.validateText(item.text)) {
        textParts.push(item.text.trim());
        continue;
      }

      // Try content array
      if (item.content && Array.isArray(item.content)) {
        for (const contentItem of item.content) {
          if (contentItem.text && this.validateText(contentItem.text)) {
            textParts.push(contentItem.text.trim());
          }
        }
      }
    }

    if (textParts.length === 0) {
      diagnostics.errors.push('No valid text content found in any output items');
      return null;
    }

    const combinedText = textParts.join(' ').trim();
    
    if (!this.validateText(combinedText)) {
      diagnostics.errors.push('Fallback text extraction produced invalid content');
      return null;
    }

    this.logger('Successfully extracted text using fallback method', {
      sources: textParts.length,
      length: combinedText.length,
      preview: combinedText.substring(0, 80)
    });

    return combinedText;
  }

  /**
   * Create a detailed error message for debugging
   */
  createDetailedErrorMessage(response: OpenAIResponse, diagnostics: ParsingDiagnostics): string {
    const parts = [
      `OpenAI response parsing failed`,
      `Status: ${diagnostics.responseStatus}`,
      `Output types: ${diagnostics.outputTypes.join(', ') || 'none'}`,
      `Has output_text: ${diagnostics.hasOutputText}`,
      `Has message content: ${diagnostics.hasMessageContent}`,
      `Content length: ${diagnostics.contentLength}`,
      `Extraction method: ${diagnostics.extractionMethod}`
    ];

    if (diagnostics.warnings.length > 0) {
      parts.push(`Warnings: ${diagnostics.warnings.join('; ')}`);
    }

    if (diagnostics.errors.length > 0) {
      parts.push(`Errors: ${diagnostics.errors.join('; ')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Log parsing statistics for monitoring
   */
  logParsingStats(diagnostics: ParsingDiagnostics): void {
    this.logger('Text extraction completed', {
      method: diagnostics.extractionMethod,
      status: diagnostics.responseStatus,
      contentLength: diagnostics.contentLength,
      warningCount: diagnostics.warnings.length,
      errorCount: diagnostics.errors.length
    });
  }

  /**
   * Get parsing statistics from error handler
   */
  getParsingStats() {
    return this.errorHandler.getParsingStats();
  }

  /**
   * Check if parsing failure rate requires attention
   */
  shouldAlert(threshold: number = 10): boolean {
    return this.errorHandler.shouldAlert(threshold);
  }

  /**
   * Reset parsing statistics
   */
  resetStats(): void {
    this.errorHandler.resetStats();
  }
}
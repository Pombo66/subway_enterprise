/**
 * Interfaces for Output Text Parser
 * Provides robust text extraction from OpenAI Responses API
 */

export interface IOutputTextParser {
  extractText(response: OpenAIResponse): Promise<string>;
  validateText(text: string): boolean;
  getDiagnostics(response: OpenAIResponse): ParsingDiagnostics;
}

export interface OpenAIResponse {
  status: string;
  output: OutputItem[];
  usage?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  incomplete_details?: {
    reason?: string;
  };
}

export interface OutputItem {
  type: string;
  content?: ContentItem[];
  text?: string;
}

export interface ContentItem {
  type: string;
  text: string;
}

export interface ParsingDiagnostics {
  responseStatus: string;
  outputTypes: string[];
  hasOutputText: boolean;
  hasMessageContent: boolean;
  contentLength: number;
  extractionMethod: 'output_text' | 'message_content' | 'fallback' | 'failed';
  warnings: string[];
  errors: string[];
}

export interface ParsingResult {
  text: string;
  diagnostics: ParsingDiagnostics;
  success: boolean;
}

export class OutputTextParsingError extends Error {
  constructor(
    message: string,
    public readonly diagnostics: ParsingDiagnostics,
    public readonly originalResponse?: OpenAIResponse
  ) {
    super(message);
    this.name = 'OutputTextParsingError';
  }
}
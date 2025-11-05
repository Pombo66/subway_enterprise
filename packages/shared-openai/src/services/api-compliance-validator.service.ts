import { StructuredMessage, MessageContent } from '../utils/message-builder.util';

/**
 * API Compliance Validator Service
 * Ensures message format validation before sending requests to OpenAI Responses API
 * Requirements: 2.4, 2.5
 */
export class APIComplianceValidatorService {
  private readonly logger: (level: string, message: string, data?: any) => void;

  constructor(logger?: (level: string, message: string, data?: any) => void) {
    this.logger = logger || ((level: string, message: string, data?: any) => {
      console.log(`[${level.toUpperCase()}] [APICompliance] ${message}`, data || '');
    });
  }

  /**
   * Validate complete API request structure against Responses API specification
   * Requirement 2.4: Validate message structure against Responses API specification
   */
  validateAPIRequest(request: any): APIValidationResult {
    const result: APIValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      compliance: {
        messagesValid: false,
        modelValid: false,
        parametersValid: false,
        formatValid: false
      }
    };

    // Validate required fields
    this.validateRequiredFields(request, result);
    
    // Validate messages structure
    this.validateMessagesStructure(request.input, result);
    
    // Validate model specification
    this.validateModelSpecification(request.model, result);
    
    // Validate API parameters
    this.validateAPIParameters(request, result);
    
    // Validate response format if specified
    this.validateResponseFormat(request.response_format, result);

    result.isValid = result.errors.length === 0;
    
    return result;
  }

  /**
   * Validate message format before sending to API
   * Requirement 2.5: Add message format validation before sending requests
   */
  validateMessageFormat(messages: StructuredMessage[]): MessageFormatValidation {
    const validation: MessageFormatValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      messageCount: messages.length,
      totalTokenEstimate: 0
    };

    if (!Array.isArray(messages)) {
      validation.errors.push('Messages must be an array');
      validation.isValid = false;
      return validation;
    }

    if (messages.length === 0) {
      validation.errors.push('Messages array cannot be empty');
      validation.isValid = false;
      return validation;
    }

    // Validate each message
    for (let i = 0; i < messages.length; i++) {
      const messageErrors = this.validateSingleMessageFormat(messages[i], i);
      validation.errors.push(...messageErrors);
      
      // Estimate tokens for this message
      validation.totalTokenEstimate += this.estimateMessageTokens(messages[i]);
    }

    // Validate message sequence
    const sequenceValidation = this.validateMessageSequence(messages);
    validation.warnings.push(...sequenceValidation.warnings);
    validation.errors.push(...sequenceValidation.errors);

    validation.isValid = validation.errors.length === 0;
    
    return validation;
  }

  /**
   * Create unit tests for message structure compliance
   * Requirement 2.5: Create unit tests for message structure compliance
   */
  createComplianceTests(): ComplianceTestSuite {
    return {
      testValidMessageStructure: () => this.testValidMessageStructure(),
      testInvalidMessageStructure: () => this.testInvalidMessageStructure(),
      testAPIRequestValidation: () => this.testAPIRequestValidation(),
      testResponseFormatValidation: () => this.testResponseFormatValidation(),
      testTokenEstimation: () => this.testTokenEstimation()
    };
  }

  /**
   * Validate required fields in API request
   */
  private validateRequiredFields(request: any, result: APIValidationResult): void {
    const requiredFields = ['model', 'input'];
    
    for (const field of requiredFields) {
      if (!request[field]) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate messages structure for Responses API
   */
  private validateMessagesStructure(messages: any, result: APIValidationResult): void {
    if (!messages) {
      result.errors.push('Missing input messages');
      return;
    }

    if (!Array.isArray(messages)) {
      result.errors.push('Input messages must be an array');
      return;
    }

    if (messages.length === 0) {
      result.errors.push('Input messages array cannot be empty');
      return;
    }

    // Validate each message structure
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (!message.role) {
        result.errors.push(`Message ${i}: Missing role field`);
      } else if (!['system', 'user', 'assistant'].includes(message.role)) {
        result.errors.push(`Message ${i}: Invalid role '${message.role}'`);
      }

      if (!message.content) {
        result.errors.push(`Message ${i}: Missing content field`);
      } else if (!Array.isArray(message.content)) {
        result.errors.push(`Message ${i}: Content must be an array`);
      } else {
        this.validateContentArray(message.content, i, result);
      }
    }

    result.compliance.messagesValid = result.errors.length === 0;
  }

  /**
   * Validate content array structure
   */
  private validateContentArray(content: any[], messageIndex: number, result: APIValidationResult): void {
    for (let j = 0; j < content.length; j++) {
      const contentItem = content[j];
      
      if (!contentItem.type) {
        result.errors.push(`Message ${messageIndex}, Content ${j}: Missing type field`);
      } else if (contentItem.type !== 'input_text') {
        result.errors.push(`Message ${messageIndex}, Content ${j}: Type must be 'input_text'`);
      }

      if (!contentItem.text) {
        result.errors.push(`Message ${messageIndex}, Content ${j}: Missing text field`);
      } else if (typeof contentItem.text !== 'string') {
        result.errors.push(`Message ${messageIndex}, Content ${j}: Text must be a string`);
      } else if (contentItem.text.trim().length === 0) {
        result.errors.push(`Message ${messageIndex}, Content ${j}: Text cannot be empty`);
      }
    }
  }

  /**
   * Validate model specification
   */
  private validateModelSpecification(model: any, result: APIValidationResult): void {
    if (!model) {
      result.errors.push('Missing model specification');
      return;
    }

    if (typeof model !== 'string') {
      result.errors.push('Model must be a string');
      return;
    }

    // Check for valid GPT-5 model names
    const validModels = ['gpt-5-turbo', 'gpt-5-mini', 'gpt-5-nano'];
    if (!validModels.some(validModel => model.includes(validModel))) {
      result.warnings.push(`Model '${model}' may not support Responses API features`);
    }

    result.compliance.modelValid = result.errors.length === 0;
  }

  /**
   * Validate API parameters
   */
  private validateAPIParameters(request: any, result: APIValidationResult): void {
    // Validate max_output_tokens
    if (request.max_output_tokens !== undefined) {
      if (typeof request.max_output_tokens !== 'number' || request.max_output_tokens <= 0) {
        result.errors.push('max_output_tokens must be a positive number');
      } else if (request.max_output_tokens > 16000) {
        result.warnings.push('max_output_tokens is very high, consider optimizing for cost');
      }
    }

    // Validate reasoning parameters
    if (request.reasoning) {
      if (request.reasoning.effort && !['minimal', 'low', 'medium', 'high'].includes(request.reasoning.effort)) {
        result.errors.push('reasoning.effort must be one of: minimal, low, medium, high');
      }
    }

    // Validate text parameters
    if (request.text) {
      if (request.text.verbosity && !['low', 'medium', 'high'].includes(request.text.verbosity)) {
        result.errors.push('text.verbosity must be one of: low, medium, high');
      }
    }

    // Check for deprecated parameters
    if (request.temperature !== undefined) {
      result.warnings.push('temperature parameter is deprecated for GPT-5 models, use reasoning.effort instead');
    }

    result.compliance.parametersValid = result.errors.length === 0;
  }

  /**
   * Validate response format specification
   */
  private validateResponseFormat(responseFormat: any, result: APIValidationResult): void {
    if (!responseFormat) {
      result.compliance.formatValid = true;
      return;
    }

    if (responseFormat.type === 'json_schema') {
      if (!responseFormat.json_schema) {
        result.errors.push('json_schema is required when type is json_schema');
      } else {
        if (!responseFormat.json_schema.name) {
          result.errors.push('json_schema.name is required');
        }
        if (!responseFormat.json_schema.schema) {
          result.errors.push('json_schema.schema is required');
        }
        if (responseFormat.json_schema.strict !== true) {
          result.warnings.push('Consider using strict: true for reliable JSON parsing');
        }
      }
    }

    result.compliance.formatValid = result.errors.length === 0;
  }

  /**
   * Validate single message format
   */
  private validateSingleMessageFormat(message: StructuredMessage, index: number): string[] {
    const errors: string[] = [];

    if (!message.role) {
      errors.push(`Message ${index}: Missing role`);
    }

    if (!message.content || !Array.isArray(message.content)) {
      errors.push(`Message ${index}: Content must be an array`);
    } else if (message.content.length === 0) {
      errors.push(`Message ${index}: Content array cannot be empty`);
    }

    return errors;
  }

  /**
   * Validate message sequence for best practices
   */
  private validateMessageSequence(messages: StructuredMessage[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for alternating pattern (recommended)
    let hasSystemMessage = false;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'system') {
        hasSystemMessage = true;
        if (i > 0) {
          warnings.push('System messages should typically come first');
        }
      }
    }

    if (!hasSystemMessage) {
      warnings.push('Consider adding a system message to provide context');
    }

    return { errors, warnings };
  }

  /**
   * Estimate token count for a message
   */
  private estimateMessageTokens(message: StructuredMessage): number {
    let tokenCount = 0;
    
    // Role overhead
    tokenCount += 1;
    
    // Content tokens (rough estimate: 1 token ≈ 4 characters)
    if (message.content) {
      for (const contentItem of message.content) {
        if (contentItem.text) {
          tokenCount += Math.ceil(contentItem.text.length / 4);
        }
      }
    }

    return tokenCount;
  }

  // Test methods for compliance validation
  private testValidMessageStructure(): boolean {
    const validMessages: StructuredMessage[] = [
      {
        role: 'system',
        content: [{ type: 'input_text', text: 'You are a helpful assistant.' }]
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: 'Hello, how are you?' }]
      }
    ];

    const validation = this.validateMessageFormat(validMessages);
    return validation.isValid;
  }

  private testInvalidMessageStructure(): boolean {
    const invalidMessages: any[] = [
      {
        role: 'invalid_role',
        content: [{ type: 'wrong_type', text: 'Test' }]
      }
    ];

    const validation = this.validateMessageFormat(invalidMessages);
    return !validation.isValid && validation.errors.length > 0;
  }

  private testAPIRequestValidation(): boolean {
    const validRequest = {
      model: 'gpt-5-turbo',
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: 'Test message' }]
        }
      ],
      max_output_tokens: 100
    };

    const validation = this.validateAPIRequest(validRequest);
    return validation.isValid;
  }

  private testResponseFormatValidation(): boolean {
    const requestWithFormat = {
      model: 'gpt-5-turbo',
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: 'Test' }]
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'test_schema',
          strict: true,
          schema: { type: 'object' }
        }
      }
    };

    const validation = this.validateAPIRequest(requestWithFormat);
    return validation.isValid;
  }

  private testTokenEstimation(): boolean {
    const message: StructuredMessage = {
      role: 'user',
      content: [{ type: 'input_text', text: 'This is a test message for token estimation.' }]
    };

    const tokens = this.estimateMessageTokens(message);
    return tokens > 0 && tokens < 100; // Reasonable estimate
  }
}

export interface APIValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  compliance: {
    messagesValid: boolean;
    modelValid: boolean;
    parametersValid: boolean;
    formatValid: boolean;
  };
}

export interface MessageFormatValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  messageCount: number;
  totalTokenEstimate: number;
}

export interface ComplianceTestSuite {
  testValidMessageStructure: () => boolean;
  testInvalidMessageStructure: () => boolean;
  testAPIRequestValidation: () => boolean;
  testResponseFormatValidation: () => boolean;
  testTokenEstimation: () => boolean;
}
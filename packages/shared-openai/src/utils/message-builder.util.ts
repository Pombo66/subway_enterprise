/**
 * Message Builder Utility
 * Provides utilities for building structured message arrays for OpenAI Responses API
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

export interface MessageContent {
  type: 'input_text';
  text: string;
}

export interface StructuredMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent[];
}

export class MessageBuilderUtil {
  /**
   * Build structured message arrays with separate system and user roles
   * Requirement 2.1: Replace string concatenation with structured message arrays
   * Requirement 2.2: Implement proper role separation for system and user messages
   */
  static buildMessages(systemPrompt: string, userPrompt: string): StructuredMessage[] {
    return [
      this.buildSystemMessage(systemPrompt),
      this.buildUserMessage(userPrompt)
    ];
  }

  /**
   * Build a system message with proper content array formatting
   * Requirement 2.3: Add content array formatting with input_text type specifications
   */
  static buildSystemMessage(text: string): StructuredMessage {
    return {
      role: 'system',
      content: [
        {
          type: 'input_text',
          text: text.trim()
        }
      ]
    };
  }

  /**
   * Build a user message with proper content array formatting
   * Requirement 2.3: Add content array formatting with input_text type specifications
   */
  static buildUserMessage(text: string): StructuredMessage {
    return {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: text.trim()
        }
      ]
    };
  }

  /**
   * Build a multi-part user message from multiple text segments
   */
  static buildMultiPartUserMessage(textSegments: string[]): StructuredMessage {
    return {
      role: 'user',
      content: textSegments
        .filter(segment => segment && segment.trim().length > 0)
        .map(segment => ({
          type: 'input_text' as const,
          text: segment.trim()
        }))
    };
  }

  /**
   * Validate message structure against Responses API specification
   * Requirement 2.4: Validate message structure against Responses API specification
   */
  static validateMessageStructure(messages: StructuredMessage[]): MessageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(messages)) {
      errors.push('Messages must be an array');
      return { isValid: false, errors, warnings };
    }

    if (messages.length === 0) {
      errors.push('Messages array cannot be empty');
      return { isValid: false, errors, warnings };
    }

    // Check each message
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageErrors = this.validateSingleMessage(message, i);
      errors.push(...messageErrors);
    }

    // Check message sequence
    const sequenceWarnings = this.validateMessageSequence(messages);
    warnings.push(...sequenceWarnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single message structure
   */
  private static validateSingleMessage(message: any, index: number): string[] {
    const errors: string[] = [];

    if (!message || typeof message !== 'object') {
      errors.push(`Message ${index}: Must be an object`);
      return errors;
    }

    // Validate role
    if (!message.role) {
      errors.push(`Message ${index}: Missing role field`);
    } else if (!['system', 'user', 'assistant'].includes(message.role)) {
      errors.push(`Message ${index}: Invalid role '${message.role}'. Must be 'system', 'user', or 'assistant'`);
    }

    // Validate content
    if (!message.content) {
      errors.push(`Message ${index}: Missing content field`);
    } else if (!Array.isArray(message.content)) {
      errors.push(`Message ${index}: Content must be an array`);
    } else {
      // Validate content items
      for (let j = 0; j < message.content.length; j++) {
        const contentItem = message.content[j];
        
        if (!contentItem || typeof contentItem !== 'object') {
          errors.push(`Message ${index}, Content ${j}: Must be an object`);
          continue;
        }

        if (contentItem.type !== 'input_text') {
          errors.push(`Message ${index}, Content ${j}: Type must be 'input_text'`);
        }

        if (!contentItem.text || typeof contentItem.text !== 'string') {
          errors.push(`Message ${index}, Content ${j}: Text must be a non-empty string`);
        } else if (contentItem.text.trim().length === 0) {
          errors.push(`Message ${index}, Content ${j}: Text cannot be empty`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate message sequence for best practices
   */
  private static validateMessageSequence(messages: StructuredMessage[]): string[] {
    const warnings: string[] = [];

    // Check if first message is system message (recommended)
    if (messages[0].role !== 'system') {
      warnings.push('Consider starting with a system message to set context');
    }

    // Check for consecutive messages with same role
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === messages[i - 1].role) {
        warnings.push(`Messages ${i - 1} and ${i} have the same role '${messages[i].role}' - consider combining them`);
      }
    }

    return warnings;
  }

  /**
   * Create a message validation error with detailed information
   */
  static createValidationError(validationResult: MessageValidationResult): Error {
    const errorMessage = [
      'Message structure validation failed:',
      ...validationResult.errors.map(error => `  - ${error}`)
    ].join('\n');

    if (validationResult.warnings.length > 0) {
      const warningMessage = [
        'Warnings:',
        ...validationResult.warnings.map(warning => `  - ${warning}`)
      ].join('\n');
      
      return new Error(`${errorMessage}\n\n${warningMessage}`);
    }

    return new Error(errorMessage);
  }

  /**
   * Get message statistics for monitoring
   */
  static getMessageStats(messages: StructuredMessage[]): MessageStats {
    const stats: MessageStats = {
      totalMessages: messages.length,
      systemMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      totalContentItems: 0,
      totalTextLength: 0,
      averageMessageLength: 0
    };

    for (const message of messages) {
      // Count by role
      switch (message.role) {
        case 'system':
          stats.systemMessages++;
          break;
        case 'user':
          stats.userMessages++;
          break;
        case 'assistant':
          stats.assistantMessages++;
          break;
      }

      // Count content items and text length
      if (message.content) {
        stats.totalContentItems += message.content.length;
        
        for (const contentItem of message.content) {
          if (contentItem.text) {
            stats.totalTextLength += contentItem.text.length;
          }
        }
      }
    }

    stats.averageMessageLength = stats.totalMessages > 0 ? 
      stats.totalTextLength / stats.totalMessages : 0;

    return stats;
  }
}

export interface MessageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MessageStats {
  totalMessages: number;
  systemMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalContentItems: number;
  totalTextLength: number;
  averageMessageLength: number;
}
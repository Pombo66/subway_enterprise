/**
 * JSON Schema Enforcer Service
 * Implements response_format with json_schema and strict: true for market analysis
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

export interface JSONSchemaConfig {
  enforceStrict: boolean;
  validateResponse: boolean;
  allowFallback: boolean;
  logValidationErrors: boolean;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  schema: string;
  data?: any;
}

export interface MarketAnalysisSchema {
  type: 'object';
  properties: {
    overallScore: { type: 'number'; minimum: 0; maximum: 100 };
    confidence: { type: 'number'; minimum: 0; maximum: 1 };
    factors: {
      type: 'object';
      properties: {
        population: { type: 'number'; minimum: 0; maximum: 100 };
        competition: { type: 'number'; minimum: 0; maximum: 100 };
        accessibility: { type: 'number'; minimum: 0; maximum: 100 };
        demographics: { type: 'number'; minimum: 0; maximum: 100 };
      };
      required: ['population', 'competition', 'accessibility', 'demographics'];
      additionalProperties: false;
    };
    insights: {
      type: 'array';
      items: {
        type: 'object';
        properties: {
          category: { type: 'string'; enum: ['population', 'competition', 'accessibility', 'demographics', 'general'] };
          message: { type: 'string'; minLength: 10; maxLength: 200 };
          impact: { type: 'string'; enum: ['positive', 'negative', 'neutral'] };
          confidence: { type: 'number'; minimum: 0; maximum: 1 };
        };
        required: ['category', 'message', 'impact', 'confidence'];
        additionalProperties: false;
      };
      minItems: 1;
      maxItems: 10;
    };
    recommendations: {
      type: 'array';
      items: {
        type: 'object';
        properties: {
          action: { type: 'string'; minLength: 10; maxLength: 100 };
          priority: { type: 'string'; enum: ['high', 'medium', 'low'] };
          rationale: { type: 'string'; minLength: 20; maxLength: 300 };
        };
        required: ['action', 'priority', 'rationale'];
        additionalProperties: false;
      };
      minItems: 1;
      maxItems: 5;
    };
    metadata: {
      type: 'object';
      properties: {
        analysisDate: { type: 'string'; format: 'date-time' };
        dataCompleteness: { type: 'number'; minimum: 0; maximum: 1 };
        processingTime: { type: 'number'; minimum: 0 };
        modelVersion: { type: 'string' };
      };
      required: ['analysisDate', 'dataCompleteness'];
      additionalProperties: false;
    };
  };
  required: ['overallScore', 'confidence', 'factors', 'insights', 'recommendations', 'metadata'];
  additionalProperties: false;
}

export class JSONSchemaEnforcerService {
  private readonly config: JSONSchemaConfig;
  private readonly logger: (message: string, data?: any) => void;
  private validationStats = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    schemaErrors: 0,
    fallbackUsed: 0
  };

  constructor(
    config: Partial<JSONSchemaConfig> = {},
    logger?: (message: string, data?: any) => void
  ) {
    this.config = {
      enforceStrict: true,
      validateResponse: true,
      allowFallback: true,
      logValidationErrors: true,
      ...config
    };

    this.logger = logger || ((message: string, data?: any) => {
      console.log(`[JSONSchemaEnforcer] ${message}`, data || '');
    });
  }

  /**
   * Create API request with enforced JSON schema
   * Requirements: 10.1, 10.2, 10.3 - Implement response_format with strict JSON schema enforcement
   */
  createSchemaEnforcedRequest(
    baseRequest: any,
    schemaType: 'market_analysis' | 'rationale' | 'custom',
    customSchema?: any
  ): any {
    const request = { ...baseRequest };

    // Get appropriate schema
    const schema = this.getSchemaForType(schemaType, customSchema);
    
    // Add response_format with json_schema and strict: true (Requirement 10.1)
    request.response_format = {
      type: 'json_schema',
      json_schema: {
        name: `${schemaType}_response`,
        schema: schema,
        strict: this.config.enforceStrict
      }
    };

    // Remove prompt-based JSON instructions (Requirement 10.3)
    if (request.input && Array.isArray(request.input)) {
      request.input = request.input.map((message: any) => {
        if (message.content && Array.isArray(message.content)) {
          message.content = message.content.map((content: any) => {
            if (content.text) {
              // Remove JSON instruction phrases
              content.text = this.removeJSONInstructions(content.text);
            }
            return content;
          });
        }
        return message;
      });
    }

    this.logger('Created schema-enforced request', {
      schemaType,
      strict: this.config.enforceStrict,
      schemaName: `${schemaType}_response`
    });

    return request;
  }

  /**
   * Validate response against schema
   * Requirements: 10.4, 10.5 - Add schema validation error handling and compliance monitoring
   */
  validateResponse(
    response: any,
    schemaType: 'market_analysis' | 'rationale' | 'custom',
    customSchema?: any
  ): SchemaValidationResult {
    this.validationStats.totalValidations++;

    const schema = this.getSchemaForType(schemaType, customSchema);
    const result: SchemaValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      schema: schemaType,
      data: response
    };

    try {
      // Basic structure validation
      if (!response || typeof response !== 'object') {
        result.errors.push('Response is not a valid object');
        this.validationStats.failedValidations++;
        return result;
      }

      // Validate against schema
      const validationResult = this.validateAgainstSchema(response, schema);
      result.isValid = validationResult.isValid;
      result.errors = validationResult.errors;
      result.warnings = validationResult.warnings;

      if (result.isValid) {
        this.validationStats.successfulValidations++;
        this.logger('Schema validation successful', {
          schemaType,
          dataKeys: Object.keys(response)
        });
      } else {
        this.validationStats.failedValidations++;
        
        if (this.config.logValidationErrors) {
          this.logger('Schema validation failed', {
            schemaType,
            errors: result.errors,
            warnings: result.warnings
          });
        }
      }

    } catch (error) {
      this.validationStats.schemaErrors++;
      result.errors.push(`Schema validation error: ${(error as Error).message}`);
      
      this.logger('Schema validation exception', {
        schemaType,
        error: (error as Error).message
      });
    }

    return result;
  }

  /**
   * Handle schema validation failures with fallback parsing
   * Requirement 10.4: Add fallback parsing when schema enforcement fails
   */
  handleValidationFailure(
    response: any,
    validationResult: SchemaValidationResult,
    schemaType: string
  ): any {
    if (!this.config.allowFallback) {
      throw new Error(`Schema validation failed: ${validationResult.errors.join(', ')}`);
    }

    this.validationStats.fallbackUsed++;
    
    this.logger('Attempting fallback parsing after schema validation failure', {
      schemaType,
      errorCount: validationResult.errors.length
    });

    try {
      // Try to extract valid parts of the response
      const fallbackResult = this.attemptFallbackParsing(response, schemaType);
      
      if (fallbackResult) {
        this.logger('Fallback parsing successful', {
          schemaType,
          extractedKeys: Object.keys(fallbackResult)
        });
        return fallbackResult;
      }
    } catch (fallbackError) {
      this.logger('Fallback parsing also failed', {
        schemaType,
        error: (fallbackError as Error).message
      });
    }

    // If all else fails, throw the original validation error
    throw new Error(`Schema validation and fallback parsing failed: ${validationResult.errors.join(', ')}`);
  }

  /**
   * Get schema for specific type
   */
  private getSchemaForType(
    schemaType: 'market_analysis' | 'rationale' | 'custom',
    customSchema?: any
  ): any {
    switch (schemaType) {
      case 'market_analysis':
        return this.getMarketAnalysisSchema();
      case 'rationale':
        return this.getRationaleSchema();
      case 'custom':
        if (!customSchema) {
          throw new Error('Custom schema required for custom schema type');
        }
        return customSchema;
      default:
        throw new Error(`Unknown schema type: ${schemaType}`);
    }
  }

  /**
   * Get comprehensive MarketAnalysis schema
   * Requirement 10.2: Define complete MarketAnalysis schema with all required fields
   */
  private getMarketAnalysisSchema(): MarketAnalysisSchema {
    return {
      type: 'object',
      properties: {
        overallScore: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1
        },
        factors: {
          type: 'object',
          properties: {
            population: { type: 'number', minimum: 0, maximum: 100 },
            competition: { type: 'number', minimum: 0, maximum: 100 },
            accessibility: { type: 'number', minimum: 0, maximum: 100 },
            demographics: { type: 'number', minimum: 0, maximum: 100 }
          },
          required: ['population', 'competition', 'accessibility', 'demographics'],
          additionalProperties: false
        },
        insights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: ['population', 'competition', 'accessibility', 'demographics', 'general']
              },
              message: { type: 'string', minLength: 10, maxLength: 200 },
              impact: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
              confidence: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['category', 'message', 'impact', 'confidence'],
            additionalProperties: false
          },
          minItems: 1,
          maxItems: 10
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', minLength: 10, maxLength: 100 },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              rationale: { type: 'string', minLength: 20, maxLength: 300 }
            },
            required: ['action', 'priority', 'rationale'],
            additionalProperties: false
          },
          minItems: 1,
          maxItems: 5
        },
        metadata: {
          type: 'object',
          properties: {
            analysisDate: { type: 'string', format: 'date-time' },
            dataCompleteness: { type: 'number', minimum: 0, maximum: 1 },
            processingTime: { type: 'number', minimum: 0 },
            modelVersion: { type: 'string' }
          },
          required: ['analysisDate', 'dataCompleteness'],
          additionalProperties: false
        }
      },
      required: ['overallScore', 'confidence', 'factors', 'insights', 'recommendations', 'metadata'],
      additionalProperties: false
    };
  }

  /**
   * Get rationale schema
   */
  private getRationaleSchema(): any {
    return {
      type: 'object',
      properties: {
        text: { type: 'string', minLength: 20, maxLength: 500 },
        factors: {
          type: 'object',
          properties: {
            population: { type: 'number', minimum: 0, maximum: 100 },
            proximity: { type: 'number', minimum: 0, maximum: 100 },
            accessibility: { type: 'number', minimum: 0, maximum: 100 }
          },
          required: ['population', 'proximity', 'accessibility'],
          additionalProperties: false
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        dataCompleteness: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['text', 'factors', 'confidence', 'dataCompleteness'],
      additionalProperties: false
    };
  }

  /**
   * Validate data against schema
   */
  private validateAgainstSchema(data: any, schema: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic implementation of JSON schema validation
    // In production, you'd use a library like ajv
    const result = this.validateObjectAgainstSchema(data, schema, '');
    
    return {
      isValid: result.errors.length === 0,
      errors: result.errors,
      warnings: result.warnings
    };
  }

  /**
   * Recursive schema validation
   */
  private validateObjectAgainstSchema(
    data: any,
    schema: any,
    path: string
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (schema.type === 'object') {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push(`${path}: Expected object, got ${typeof data}`);
        return { errors, warnings };
      }

      // Check required properties
      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in data)) {
            errors.push(`${path}: Missing required property '${requiredProp}'`);
          }
        }
      }

      // Check properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in data) {
            const propPath = path ? `${path}.${propName}` : propName;
            const propResult = this.validateObjectAgainstSchema(data[propName], propSchema, propPath);
            errors.push(...propResult.errors);
            warnings.push(...propResult.warnings);
          }
        }
      }

      // Check additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = new Set(Object.keys(schema.properties || {}));
        for (const propName of Object.keys(data)) {
          if (!allowedProps.has(propName)) {
            warnings.push(`${path}: Unexpected property '${propName}'`);
          }
        }
      }
    } else if (schema.type === 'array') {
      if (!Array.isArray(data)) {
        errors.push(`${path}: Expected array, got ${typeof data}`);
        return { errors, warnings };
      }

      if (schema.minItems && data.length < schema.minItems) {
        errors.push(`${path}: Array too short (${data.length} < ${schema.minItems})`);
      }

      if (schema.maxItems && data.length > schema.maxItems) {
        errors.push(`${path}: Array too long (${data.length} > ${schema.maxItems})`);
      }

      if (schema.items) {
        data.forEach((item, index) => {
          const itemPath = `${path}[${index}]`;
          const itemResult = this.validateObjectAgainstSchema(item, schema.items, itemPath);
          errors.push(...itemResult.errors);
          warnings.push(...itemResult.warnings);
        });
      }
    } else if (schema.type === 'string') {
      if (typeof data !== 'string') {
        errors.push(`${path}: Expected string, got ${typeof data}`);
      } else {
        if (schema.minLength && data.length < schema.minLength) {
          errors.push(`${path}: String too short (${data.length} < ${schema.minLength})`);
        }
        if (schema.maxLength && data.length > schema.maxLength) {
          errors.push(`${path}: String too long (${data.length} > ${schema.maxLength})`);
        }
        if (schema.enum && !schema.enum.includes(data)) {
          errors.push(`${path}: Value '${data}' not in allowed values: ${schema.enum.join(', ')}`);
        }
      }
    } else if (schema.type === 'number') {
      if (typeof data !== 'number') {
        errors.push(`${path}: Expected number, got ${typeof data}`);
      } else {
        if (schema.minimum !== undefined && data < schema.minimum) {
          errors.push(`${path}: Number too small (${data} < ${schema.minimum})`);
        }
        if (schema.maximum !== undefined && data > schema.maximum) {
          errors.push(`${path}: Number too large (${data} > ${schema.maximum})`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Remove JSON instruction phrases from prompts
   * Requirement 10.3: Remove prompt-based JSON instructions in favor of API enforcement
   */
  private removeJSONInstructions(text: string): string {
    const jsonInstructions = [
      /always respond with valid json/gi,
      /respond with json/gi,
      /return json/gi,
      /output json/gi,
      /format.*json/gi,
      /json format/gi,
      /valid json/gi,
      /json response/gi,
      /json object/gi,
      /structure.*json/gi
    ];

    let cleanedText = text;
    
    for (const pattern of jsonInstructions) {
      cleanedText = cleanedText.replace(pattern, '');
    }

    // Clean up extra spaces and punctuation
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
    cleanedText = cleanedText.replace(/[.,]\s*[.,]/g, '.');

    return cleanedText;
  }

  /**
   * Attempt fallback parsing when schema validation fails
   */
  private attemptFallbackParsing(response: any, schemaType: string): any | null {
    try {
      if (schemaType === 'market_analysis') {
        return this.extractMarketAnalysisData(response);
      } else if (schemaType === 'rationale') {
        return this.extractRationaleData(response);
      }
    } catch (error) {
      this.logger('Fallback parsing failed', {
        schemaType,
        error: (error as Error).message
      });
    }

    return null;
  }

  /**
   * Extract market analysis data with fallback logic
   */
  private extractMarketAnalysisData(response: any): any {
    const extracted: any = {
      overallScore: 0,
      confidence: 0,
      factors: {
        population: 0,
        competition: 0,
        accessibility: 0,
        demographics: 0
      },
      insights: [],
      recommendations: [],
      metadata: {
        analysisDate: new Date().toISOString(),
        dataCompleteness: 0
      }
    };

    // Try to extract what we can
    if (response.overallScore !== undefined) {
      extracted.overallScore = Math.max(0, Math.min(100, Number(response.overallScore) || 0));
    }

    if (response.confidence !== undefined) {
      extracted.confidence = Math.max(0, Math.min(1, Number(response.confidence) || 0));
    }

    if (response.factors && typeof response.factors === 'object') {
      Object.assign(extracted.factors, response.factors);
    }

    if (Array.isArray(response.insights)) {
      extracted.insights = response.insights.slice(0, 10);
    }

    if (Array.isArray(response.recommendations)) {
      extracted.recommendations = response.recommendations.slice(0, 5);
    }

    return extracted;
  }

  /**
   * Extract rationale data with fallback logic
   */
  private extractRationaleData(response: any): any {
    return {
      text: response.text || response.rationale || 'No rationale provided',
      factors: response.factors || {
        population: 0,
        proximity: 0,
        accessibility: 0
      },
      confidence: Math.max(0, Math.min(1, Number(response.confidence) || 0)),
      dataCompleteness: Math.max(0, Math.min(1, Number(response.dataCompleteness) || 0))
    };
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): typeof this.validationStats {
    return { ...this.validationStats };
  }

  /**
   * Reset validation statistics
   */
  resetStats(): void {
    this.validationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      schemaErrors: 0,
      fallbackUsed: 0
    };
  }
}
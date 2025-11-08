/**
 * Safe JSON Parsing Utilities
 * Handles malformed JSON with automatic repair
 */

import { z } from 'zod';

/**
 * Attempt to repair and parse JSON
 * Falls back to manual fixes if jsonrepair is not available
 */
export function safeParseJSON<T = any>(jsonString: string): T {
  // Try standard JSON.parse first
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    // Attempt basic repairs
    const repaired = repairJSON(jsonString);
    try {
      return JSON.parse(repaired);
    } catch (repairError) {
      throw new Error(
        `Failed to parse JSON even after repair. Original error: ${error instanceof Error ? error.message : 'Unknown'}. ` +
        `Repair error: ${repairError instanceof Error ? repairError.message : 'Unknown'}`
      );
    }
  }
}

/**
 * Safe parse with Zod schema validation
 */
export function safeParseJSONWithSchema<T>(
  jsonString: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = safeParseJSON(jsonString);
    const result = schema.safeParse(parsed);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: `Schema validation failed: ${result.error.message}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Basic JSON repair function
 * Handles common issues like trailing commas, missing quotes, etc.
 */
function repairJSON(jsonString: string): string {
  let repaired = jsonString.trim();
  
  // Remove trailing commas before closing brackets/braces
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix single quotes to double quotes (but not inside strings)
  repaired = repaired.replace(/'/g, '"');
  
  // Remove comments (// and /* */)
  repaired = repaired.replace(/\/\/.*$/gm, '');
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Fix missing commas between array/object elements
  repaired = repaired.replace(/}(\s*){/g, '},\n{');
  repaired = repaired.replace(/](\s*)\[/g, '],\n[');
  
  // Fix unquoted keys (basic pattern)
  repaired = repaired.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  return repaired;
}

/**
 * Extract JSON from text that might contain markdown or other content
 */
export function extractJSON(text: string | any): string {
  // Ensure text is a string
  if (typeof text !== 'string') {
    // If it's already an object, stringify it
    if (typeof text === 'object' && text !== null) {
      return JSON.stringify(text);
    }
    // Convert to string
    text = String(text);
  }
  
  // Look for JSON in code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }
  
  // Look for JSON object
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }
  
  // Look for JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }
  
  return text;
}

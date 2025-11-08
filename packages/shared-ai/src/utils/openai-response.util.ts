/**
 * OpenAI Response Utilities
 * Handles extraction of text content from various OpenAI response formats
 */

/**
 * Extract text content from OpenAI response
 * Handles multiple response formats (chat, reasoning models, etc.)
 */
export function extractText(response: any): string {
  // Handle null/undefined
  if (!response) {
    throw new Error('OpenAI response is null or undefined');
  }

  // Format 1: Standard chat completion with choices
  if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
    const firstChoice = response.choices[0];
    
    // Check message.content
    if (firstChoice.message?.content) {
      return firstChoice.message.content;
    }
    
    // Check text field (older format)
    if (firstChoice.text) {
      return firstChoice.text;
    }
  }

  // Format 2: Response object with output array (new reasoning models)
  if (response.output && Array.isArray(response.output)) {
    // Look for message type first (preferred for structured output)
    const messageOutput = response.output.find((item: any) => item.type === 'message');
    if (messageOutput?.content) {
      // Handle content as array of objects with text
      if (Array.isArray(messageOutput.content) && messageOutput.content.length > 0) {
        const textItem = messageOutput.content.find((c: any) => c.type === 'text');
        if (textItem?.text && typeof textItem.text === 'string') {
          return textItem.text;
        }
        // Fallback to first item with text
        if (messageOutput.content[0]?.text && typeof messageOutput.content[0].text === 'string') {
          return messageOutput.content[0].text;
        }
      }
      // Handle content as string
      if (typeof messageOutput.content === 'string') {
        return messageOutput.content;
      }
    }
    
    // Fall back to reasoning output (but only if it has content)
    const reasoningOutput = response.output.find((item: any) => item.type === 'reasoning');
    if (reasoningOutput?.content) {
      // Handle content as array
      if (Array.isArray(reasoningOutput.content) && reasoningOutput.content.length > 0) {
        const textItem = reasoningOutput.content.find((c: any) => c.type === 'text');
        if (textItem?.text && typeof textItem.text === 'string' && textItem.text.length > 0) {
          return textItem.text;
        }
        if (reasoningOutput.content[0]?.text && typeof reasoningOutput.content[0].text === 'string' && reasoningOutput.content[0].text.length > 0) {
          return reasoningOutput.content[0].text;
        }
      }
      // Handle content as string
      if (typeof reasoningOutput.content === 'string' && reasoningOutput.content.length > 0) {
        return reasoningOutput.content;
      }
    }
    
    // Fall back to any other output with content
    for (const output of response.output) {
      if (output.content) {
        // Handle content as array
        if (Array.isArray(output.content) && output.content.length > 0) {
          const textItem = output.content.find((c: any) => c.type === 'text');
          if (textItem?.text && typeof textItem.text === 'string' && textItem.text.length > 0) {
            return textItem.text;
          }
          if (output.content[0]?.text && typeof output.content[0].text === 'string' && output.content[0].text.length > 0) {
            return output.content[0].text;
          }
        }
        // Handle content as string
        if (typeof output.content === 'string' && output.content.length > 0) {
          return output.content;
        }
      }
    }
  }

  // Format 3: Direct content field
  if (response.content) {
    return response.content;
  }

  // Format 4: Direct message field
  if (response.message?.content) {
    return response.message.content;
  }

  // Format 5: Text field
  if (response.text) {
    return response.text;
  }

  // Debug information for unsupported format
  const availableFields = Object.keys(response).join(', ');
  const outputTypes = response.output 
    ? response.output.map((item: any) => `${item.type}:${item.content ? item.content.length : 0}`).join(', ')
    : 'none';
  
  throw new Error(
    `No usable content in OpenAI response. Available fields: ${availableFields}. ` +
    `Available outputs: ${outputTypes}`
  );
}

/**
 * Extract text with fallback value
 */
export function extractTextSafe(response: any, fallback: string = ''): string {
  try {
    return extractText(response);
  } catch (error) {
    console.warn('Failed to extract text from OpenAI response:', error);
    return fallback;
  }
}

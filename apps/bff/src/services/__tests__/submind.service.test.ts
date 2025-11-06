import { SubMindService } from '../submind.service';
import { SubMindQueryDto } from '../../dto/submind.dto';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('SubMindService', () => {
  let service: SubMindService;
  let mockOpenAI: any;

  beforeEach(() => {
    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Get mock OpenAI instance
    const { OpenAI } = require('openai');
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    OpenAI.mockImplementation(() => mockOpenAI);
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      service = new SubMindService();
      
      expect(service.isServiceEnabled()).toBe(true);
    });

    it('should be disabled without API key', () => {
      service = new SubMindService();
      
      expect(service.isServiceEnabled()).toBe(false);
    });
  });

  describe('processQuery', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key';
      service = new SubMindService();
    });

    it('should process a simple query successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a test response from SubMind.',
          },
        }],
        usage: {
          total_tokens: 50,
        },
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const query: SubMindQueryDto = {
        prompt: 'What are the current KPIs?',
      };
      
      const result = await service.processQuery(query);
      
      expect(result.message).toBe('This is a test response from SubMind.');
      expect(result.meta?.tokens).toBe(50);
      expect(result.meta?.latencyMs).toBeGreaterThan(0);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('SubMind'),
          },
          {
            role: 'user',
            content: 'What are the current KPIs?',
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
    });

    it('should process query with context', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Dashboard analysis response.',
          },
        }],
        usage: {
          total_tokens: 75,
        },
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const query: SubMindQueryDto = {
        prompt: 'Explain the dashboard',
        context: {
          screen: 'dashboard',
          scope: {
            region: 'EMEA',
            country: 'UK',
          },
        },
      };
      
      const result = await service.processQuery(query);
      
      expect(result.message).toBe('Dashboard analysis response.');
      expect(result.sources).toHaveLength(2); // screen and scope sources
      
      // Check that context was included in the prompt
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[1].content).toContain('Current screen: dashboard');
      expect(callArgs.messages[1].content).toContain('Region: EMEA, Country: UK');
    });

    it('should sanitize HTML from prompts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Clean response.',
          },
        }],
        usage: {
          total_tokens: 25,
        },
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const query: SubMindQueryDto = {
        prompt: 'What about <script>alert("xss")</script> this data?',
      };
      
      await service.processQuery(query);
      
      // Check that HTML was stripped from the prompt
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[1].content).not.toContain('<script>');
      expect(callArgs.messages[1].content).toContain('What about  this data?');
    });

    it('should clamp long prompts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Response to long prompt.',
          },
        }],
        usage: {
          total_tokens: 100,
        },
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const longPrompt = 'A'.repeat(5000); // Exceeds 4000 char limit
      const query: SubMindQueryDto = {
        prompt: longPrompt,
      };
      
      await service.processQuery(query);
      
      // Check that prompt was clamped
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[1].content.length).toBeLessThanOrEqual(4000);
    });

    it('should throw error when service is disabled', async () => {
      const disabledService = new SubMindService(); // No API key
      
      const query: SubMindQueryDto = {
        prompt: 'Test query',
      };
      
      await expect(disabledService.processQuery(query)).rejects.toThrow('AI disabled - missing API key');
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));
      
      const query: SubMindQueryDto = {
        prompt: 'Test query',
      };
      
      await expect(service.processQuery(query)).rejects.toThrow('AI processing failed: OpenAI API error');
    });

    it('should handle empty responses', async () => {
      const mockResponse = {
        choices: [],
        usage: {
          total_tokens: 10,
        },
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const query: SubMindQueryDto = {
        prompt: 'Test query',
      };
      
      const result = await service.processQuery(query);
      
      expect(result.message).toBe('No response generated');
      expect(result.meta?.tokens).toBe(10);
    });

    it('should validate prompt input', async () => {
      const invalidQueries = [
        { prompt: '' },
        { prompt: '   ' },
        { prompt: null as any },
        { prompt: undefined as any },
      ];
      
      for (const query of invalidQueries) {
        await expect(service.processQuery(query)).rejects.toThrow();
      }
    });

    it('should include sources based on context', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Response with sources.',
          },
        }],
        usage: {
          total_tokens: 50,
        },
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const query: SubMindQueryDto = {
        prompt: 'Test query',
        context: {
          screen: 'stores',
          scope: {
            storeId: 'store-123',
          },
        },
      };
      
      const result = await service.processQuery(query);
      
      expect(result.sources).toEqual([
        {
          type: 'note',
          ref: 'Screen context: stores',
        },
        {
          type: 'note',
          ref: 'User scope and filters applied',
        },
      ]);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key';
      service = new SubMindService();
    });

    it('should handle malformed context gracefully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Response despite malformed context.',
          },
        }],
        usage: {
          total_tokens: 30,
        },
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const query: SubMindQueryDto = {
        prompt: 'Test query',
        context: {
          selection: { circular: null },
        } as any,
      };
      
      // Should not throw despite malformed context
      const result = await service.processQuery(query);
      expect(result.message).toBe('Response despite malformed context.');
    });

    it('should handle missing usage information', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Response without usage info.',
          },
        }],
        // No usage field
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const query: SubMindQueryDto = {
        prompt: 'Test query',
      };
      
      const result = await service.processQuery(query);
      
      expect(result.message).toBe('Response without usage info.');
      expect(result.meta?.tokens).toBe(0);
      expect(result.meta?.latencyMs).toBeGreaterThan(0);
    });
  });
});
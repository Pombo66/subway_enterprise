import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import { NetworkError, ApiError } from '../../errors/base.error';

// Mock ToastProvider
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();

jest.mock('@/app/components/ToastProvider', () => ({
  useToast: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
  }),
}));

// Mock ErrorHandler
jest.mock('../../types/error.types', () => ({
  ErrorHandler: {
    parseError: jest.fn((error) => {
      if (error instanceof Error) {
        return { message: error.message, details: [] };
      }
      if (typeof error === 'string') {
        return { message: error, details: [] };
      }
      return { message: 'Unknown error', details: [] };
    }),
  },
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    mockShowError.mockClear();
    mockShowSuccess.mockClear();
    jest.clearAllMocks();
  });

  test('should handle errors with toast notifications by default', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      const errorResult = result.current.handleError(new Error('Test error'));
      expect(errorResult).toEqual({ message: 'Test error', details: [] });
    });

    expect(mockShowError).toHaveBeenCalledWith('Test error');
  });

  test('should handle errors without toast when disabled', () => {
    const { result } = renderHook(() => useErrorHandler({ showToast: false }));

    act(() => {
      const errorResult = result.current.handleError(new Error('Test error'));
      expect(errorResult).toEqual({ message: 'Test error', details: [] });
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });

  test('should handle errors with context', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('Test error'), 'form submission');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error in form submission:', expect.any(Error));
    expect(mockShowError).toHaveBeenCalledWith('Test error');

    consoleSpy.mockRestore();
  });

  test('should disable logging when configured', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useErrorHandler({ logErrors: false }));

    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('should handle validation errors with field details', () => {
    // Mock ErrorHandler to return validation details
    const mockErrorHandler = require('../../types/error.types').ErrorHandler;
    mockErrorHandler.parseError.mockReturnValueOnce({
      message: 'Validation failed',
      details: [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Invalid email' },
      ],
    });

    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError('validation error');
    });

    expect(mockShowError).toHaveBeenCalledWith(
      'Validation failed. name: Name is required, email: Invalid email'
    );
  });

  describe('handleApiError', () => {
    test('should handle successful API calls', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockApiCall = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

      let apiResult;
      await act(async () => {
        apiResult = await result.current.handleApiError(mockApiCall);
      });

      expect(apiResult).toEqual({
        success: true,
        data: { id: 1, name: 'test' },
      });
      expect(mockApiCall).toHaveBeenCalled();
    });

    test('should handle API call failures', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));

      let apiResult;
      await act(async () => {
        apiResult = await result.current.handleApiError(mockApiCall, 'data fetch');
      });

      expect(apiResult).toEqual({
        success: false,
        error: 'API Error',
        details: [],
      });
      expect(mockShowError).toHaveBeenCalledWith('API Error');
    });

    test('should show success toast when configured', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockApiCall = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

      await act(async () => {
        await result.current.handleApiError(mockApiCall, 'data save', {
          showSuccessToast: true,
          successMessage: 'Data saved successfully',
        });
      });

      expect(mockShowSuccess).toHaveBeenCalledWith('Data saved successfully');
    });

    test('should suppress error toast when configured', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));

      // Clear any previous calls
      mockShowError.mockClear();

      await act(async () => {
        await result.current.handleApiError(mockApiCall, 'data fetch', {
          suppressErrorToast: true,
        });
      });

      // The suppressErrorToast option should prevent the toast
      expect(mockShowError).not.toHaveBeenCalled();
    });
  });

  describe('handleFormError', () => {
    test('should handle form errors without toast', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        const formResult = result.current.handleFormError(new Error('Form error'));
        expect(formResult).toEqual({ message: 'Form error', details: [] });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Form error:', expect.any(Error));
      expect(mockShowError).not.toHaveBeenCalled(); // Form errors don't show toast

      consoleSpy.mockRestore();
    });

    test('should handle form errors with context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleFormError(new Error('Form error'), 'user registration');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Form error in user registration:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('factory methods', () => {
    test('should create error handler with context', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        const contextHandler = result.current.createErrorHandler('user management');
        contextHandler(new Error('Test error'));
      });

      expect(mockShowError).toHaveBeenCalledWith('Test error');
    });

    test('should create API error handler with context', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockApiCall = jest.fn().mockResolvedValue({ success: true });

      await act(async () => {
        const contextApiHandler = result.current.createApiErrorHandler('user management');
        const apiResult = await contextApiHandler(mockApiCall);
        expect(apiResult).toEqual({ success: true, data: { success: true } });
      });
    });
  });

  test('should handle different error types', () => {
    const { result } = renderHook(() => useErrorHandler());

    // Test string error
    act(() => {
      result.current.handleError('String error message');
    });
    expect(mockShowError).toHaveBeenCalledWith('String error message');

    // Test Error object
    act(() => {
      result.current.handleError(new Error('Error object'));
    });
    expect(mockShowError).toHaveBeenCalledWith('Error object');

    // Test NetworkError
    act(() => {
      result.current.handleError(new NetworkError('Network failed', 500, '/api/test'));
    });
    expect(mockShowError).toHaveBeenCalledWith('Network failed');

    // Test ApiError
    act(() => {
      result.current.handleError(new ApiError('API failed', 'API_ERROR'));
    });
    expect(mockShowError).toHaveBeenCalledWith('API failed');
  });
});
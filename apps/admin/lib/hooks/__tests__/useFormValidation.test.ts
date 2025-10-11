import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useFormValidation } from '../useFormValidation';

// Mock ErrorHandler
jest.mock('../../types/error.types', () => ({
  ErrorHandler: {
    parseError: jest.fn((error) => {
      if (error instanceof Error) {
        return { message: error.message, details: [] };
      }
      return { message: 'Unknown error', details: [] };
    }),
    getFieldError: jest.fn((errors, fieldName) => {
      const error = errors.find((err: any) => err.field === fieldName);
      return error?.message;
    }),
    hasFieldError: jest.fn((errors, fieldName) => {
      return errors.some((err: any) => err.field === fieldName);
    }),
  },
}));

describe('useFormValidation', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18, 'Must be at least 18'),
  });

  const mockOnSubmit = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnError.mockClear();
  });

  test('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        onError: mockOnError,
      })
    );

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errors).toEqual([]);
    expect(result.current.submitError).toBe(null);
  });

  test('should validate individual fields', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    // Note: The current implementation validates the entire form for field validation
    // This is a limitation of the current approach - we'll test the actual behavior
    act(() => {
      const isValid = result.current.validateField('name', '');
      expect(isValid).toBe(false);
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toEqual({
      field: 'name',
      message: 'Name is required',
      code: 'too_small',
    });
  });

  test('should validate entire form', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    act(() => {
      const validation = result.current.validateForm({
        name: 'John',
        email: 'john@example.com',
        age: 25,
      });
      expect(validation.success).toBe(true);
      expect(validation.data).toEqual({
        name: 'John',
        email: 'john@example.com',
        age: 25,
      });
    });

    expect(result.current.errors).toEqual([]);
  });

  test('should handle form validation errors', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    act(() => {
      const validation = result.current.validateForm({
        name: '',
        email: 'invalid-email',
        age: 16,
      });
      expect(validation.success).toBe(false);
    });

    expect(result.current.errors).toHaveLength(3);
    expect(result.current.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name', message: 'Name is required' }),
        expect.objectContaining({ field: 'email', message: 'Invalid email format' }),
        expect.objectContaining({ field: 'age', message: 'Must be at least 18' }),
      ])
    );
  });

  test('should handle successful form submission', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    const formData = {
      name: 'John',
      email: 'john@example.com',
      age: 25,
    };

    await act(async () => {
      await result.current.handleSubmit(formData);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(formData);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errors).toEqual([]);
    expect(result.current.submitError).toBe(null);
  });

  test('should handle form submission errors', async () => {
    const submitError = new Error('Submission failed');
    mockOnSubmit.mockRejectedValueOnce(submitError);

    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        onError: mockOnError,
      })
    );

    const formData = {
      name: 'John',
      email: 'john@example.com',
      age: 25,
    };

    await act(async () => {
      await result.current.handleSubmit(formData);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(formData);
    expect(mockOnError).toHaveBeenCalledWith(submitError);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitError).toBe('Submission failed');
  });

  test('should not submit form with validation errors', async () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    const invalidFormData = {
      name: '',
      email: 'invalid-email',
      age: 16,
    };

    await act(async () => {
      await result.current.handleSubmit(invalidFormData);
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(result.current.errors).toHaveLength(3);
  });

  test('should clear all errors', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    // Add some errors first
    act(() => {
      result.current.validateForm({
        name: '',
        email: 'invalid',
        age: 16,
      });
    });

    expect(result.current.errors).toHaveLength(3);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toEqual([]);
    expect(result.current.submitError).toBe(null);
  });

  test('should clear field-specific errors', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    // Add some errors first
    act(() => {
      result.current.validateForm({
        name: '',
        email: 'invalid',
        age: 16,
      });
    });

    expect(result.current.errors).toHaveLength(3);

    act(() => {
      result.current.clearFieldError('name');
    });

    expect(result.current.errors).toHaveLength(2);
    expect(result.current.errors.find(err => err.field === 'name')).toBeUndefined();
  });

  test('should get field error', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    // Add some errors first
    act(() => {
      result.current.validateForm({
        name: '',
        email: 'invalid',
        age: 16,
      });
    });

    const nameError = result.current.getFieldError('name');
    expect(nameError).toBe('Name is required');

    const nonExistentError = result.current.getFieldError('nonexistent');
    expect(nonExistentError).toBeUndefined();
  });

  test('should check if field has error', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    // Add some errors first
    act(() => {
      result.current.validateForm({
        name: '',
        email: 'john@example.com',
        age: 25,
      });
    });

    expect(result.current.hasFieldError('name')).toBe(true);
    expect(result.current.hasFieldError('email')).toBe(false);
  });

  test('should set isSubmitting during form submission', async () => {
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValueOnce(submitPromise);

    const { result } = renderHook(() =>
      useFormValidation({
        schema: testSchema,
        onSubmit: mockOnSubmit,
      })
    );

    const formData = {
      name: 'John',
      email: 'john@example.com',
      age: 25,
    };

    act(() => {
      result.current.handleSubmit(formData);
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveSubmit!();
      await submitPromise;
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});
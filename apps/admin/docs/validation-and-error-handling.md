# Validation and Error Handling System

This document describes the comprehensive validation and error handling system implemented for the Subway Enterprise admin application.

## Overview

The system provides:
- **Zod-based validation** for both frontend and backend
- **Consistent error response formatting** across all API endpoints
- **User-friendly error display components** with validation support
- **Comprehensive error boundaries** for graceful error recovery
- **Form validation hooks** with real-time feedback
- **Centralized error handling** with toast notifications

## Backend Validation (BFF)

### Zod Schemas

All API endpoints use Zod schemas for request validation:

```typescript
// apps/bff/src/schemas/menu.schemas.ts
export const CreateMenuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  price: z.number().min(0.01, 'Price must be greater than 0').max(999.99, 'Price must be less than 1000'),
  storeId: z.string().min(1, 'Store ID is required'),
  active: z.boolean().default(true),
});
```

### Validation Decorators

Use validation decorators in controllers for automatic request validation:

```typescript
@Post('/menu/items')
async createMenuItem(
  @ValidateBody(CreateMenuItemSchema) body: CreateMenuItemDto
): Promise<ApiResponse<MenuItemResponse>> {
  // Implementation
}
```

### Error Response Format

All API responses follow a consistent format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

// Validation errors include detailed field information
interface ValidationErrorResponse {
  code: 'VALIDATION_ERROR';
  message: string;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  timestamp: string;
}
```

### Error Interceptor

The enhanced error interceptor provides:
- Automatic error response formatting
- Prisma error handling
- Validation error processing
- Consistent HTTP status codes

## Frontend Error Handling

### Error Types and Utilities

```typescript
// apps/admin/lib/types/error.types.ts
export class ErrorHandler {
  static parseError(error: unknown): { message: string; details?: ValidationError[] }
  static isValidationError(error: unknown): error is ValidationErrorResponse
  static getFieldError(errors: ValidationError[], fieldName: string): string | undefined
}
```

### Error Display Components

#### ErrorBoundary
Catches and displays React component errors:

```typescript
<ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
  <YourComponent />
</ErrorBoundary>
```

#### ErrorDisplay
Shows formatted error messages with validation details:

```typescript
<ErrorDisplay 
  error={error} 
  showRetry={true}
  onRetry={() => refetch()}
/>
```

#### FieldError
Displays field-specific validation errors:

```typescript
<FieldError errors={validationErrors} fieldName="name" />
```

### Form Validation Hook

The `useFormValidation` hook provides comprehensive form validation:

```typescript
const {
  isSubmitting,
  errors,
  submitError,
  handleSubmit,
  getFieldError,
  hasFieldError,
} = useFormValidation({
  schema: CreateMenuItemSchema,
  onSubmit: async (data) => {
    await createMenuItem(data);
  },
});
```

### Error Handler Hook

The `useErrorHandler` hook provides centralized error handling:

```typescript
const { handleApiError } = useErrorHandler();

const result = await handleApiError(
  () => api.createMenuItem(data),
  'creating menu item',
  {
    showSuccessToast: true,
    successMessage: 'Item created successfully!',
  }
);
```

## Usage Examples

### Backend Controller with Validation

```typescript
@Controller()
@UseInterceptors(ErrorInterceptor)
export class MenuController {
  @Post('/menu/items')
  async createMenuItem(
    @ValidateBody(CreateMenuItemSchema) body: CreateMenuItemDto
  ): Promise<ApiResponse<MenuItemResponse>> {
    // Validation is automatic - body is guaranteed to be valid
    const item = await this.prisma.menuItem.create({
      data: body,
    });
    
    return ApiResponseBuilder.success(item);
  }
}
```

### Frontend Form with Validation

```typescript
function CreateItemForm() {
  const {
    isSubmitting,
    errors,
    submitError,
    handleSubmit,
    hasFieldError,
  } = useFormValidation({
    schema: CreateMenuItemSchema,
    onSubmit: async (data) => {
      await createMenuItem(data);
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(formData);
    }}>
      {submitError && <ErrorDisplay error={submitError} />}
      
      <input
        name="name"
        className={hasFieldError('name') ? 'error' : ''}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      <FieldError errors={errors} fieldName="name" />
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Item'}
      </button>
    </form>
  );
}
```

### API Client with Error Handling

```typescript
async function createMenuItem(data: CreateMenuItemData) {
  const result = await bffWithErrorHandling('/menu/items', MenuItemSchema, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (result.success) {
    return result.data;
  } else {
    // Error is automatically parsed and can include validation details
    throw new Error(result.error);
  }
}
```

## Error Recovery Strategies

### Automatic Retry
For transient errors, the system provides automatic retry mechanisms:

```typescript
<ErrorDisplay 
  error={error}
  showRetry={true}
  onRetry={() => refetch()}
/>
```

### Graceful Degradation
Error boundaries ensure that errors in one component don't break the entire application:

```typescript
// Specialized error boundaries for different contexts
export const withFormErrorBoundary = (Component) => 
  withErrorBoundary(Component, <FormErrorFallback />);

export const withTableErrorBoundary = (Component) => 
  withErrorBoundary(Component, <TableErrorFallback />);
```

### User Feedback
The toast system provides immediate feedback for user actions:

```typescript
const { showSuccess, showError } = useToast();

try {
  await createItem(data);
  showSuccess('Item created successfully!');
} catch (error) {
  showError('Failed to create item. Please try again.');
}
```

## Best Practices

### Backend
1. **Always use Zod schemas** for request validation
2. **Use validation decorators** instead of manual validation
3. **Return consistent error responses** using ApiResponseBuilder
4. **Handle Prisma errors** appropriately in the error interceptor
5. **Log errors** for debugging while sanitizing client responses

### Frontend
1. **Wrap components in error boundaries** to prevent crashes
2. **Use validation hooks** for forms instead of manual validation
3. **Display field-specific errors** near form inputs
4. **Provide retry mechanisms** for recoverable errors
5. **Show loading states** during async operations

### Error Messages
1. **Be specific and actionable** in error messages
2. **Use consistent language** across the application
3. **Provide context** about what went wrong
4. **Suggest solutions** when possible
5. **Avoid technical jargon** in user-facing messages

## Testing Error Handling

### Backend Tests
```typescript
describe('Menu Controller', () => {
  it('should return validation error for invalid data', async () => {
    const response = await request(app)
      .post('/menu/items')
      .send({ name: '', price: -1 })
      .expect(400);
      
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('VALIDATION_ERROR');
  });
});
```

### Frontend Tests
```typescript
describe('CreateItemForm', () => {
  it('should display validation errors', async () => {
    render(<CreateItemForm />);
    
    fireEvent.click(screen.getByText('Create Item'));
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });
});
```

This comprehensive system ensures that all errors are handled gracefully, users receive helpful feedback, and the application remains stable even when things go wrong.
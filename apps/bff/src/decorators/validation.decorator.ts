import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Decorator for validating request body with Zod schema
 */
export const ValidateBody = (schema: z.ZodSchema) => {
  return createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const body = request.body;

    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        throw new BadRequestException({
          message: 'Validation failed',
          errors: validationErrors,
          statusCode: 400,
        });
      }
      throw new BadRequestException('Invalid request body');
    }
  })();
};

/**
 * Decorator for validating query parameters with Zod schema
 */
export const ValidateQuery = (schema: z.ZodSchema) => {
  return createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    try {
      return schema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        throw new BadRequestException({
          message: 'Invalid query parameters',
          errors: validationErrors,
          statusCode: 400,
        });
      }
      throw new BadRequestException('Invalid query parameters');
    }
  })();
};

/**
 * Decorator for validating route parameters with Zod schema
 */
export const ValidateParams = (schema: z.ZodSchema) => {
  return createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const params = request.params;

    try {
      return schema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        throw new BadRequestException({
          message: 'Invalid route parameters',
          errors: validationErrors,
          statusCode: 400,
        });
      }
      throw new BadRequestException('Invalid route parameters');
    }
  })();
};

/**
 * Utility function for manual validation
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationErrors,
        statusCode: 400,
      });
    }
    throw new BadRequestException('Validation failed');
  }
}
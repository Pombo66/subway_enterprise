import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
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
}

/**
 * Factory function to create validation pipes for different schemas
 */
export function createZodValidationPipe(schema: z.ZodSchema) {
  return new ZodValidationPipe(schema);
}
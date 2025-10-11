import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponseBuilder, ApiResponse } from '../types/api-response';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;

    return next.handle().pipe(
      map((data) => {
        // If the response is already an ApiResponse, return it as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        // Otherwise, wrap it in a success response
        return ApiResponseBuilder.success(data);
      }),
      catchError((error: unknown) => {
        console.error(`Error in ${method} ${url}:`, error);
        
        // Handle validation errors from Zod
        if (error instanceof BadRequestException) {
          const errorResponse = error.getResponse();
          
          if (typeof errorResponse === 'object' && errorResponse !== null && 'errors' in errorResponse) {
            const validationResponse = errorResponse as {
              message: string;
              errors: Array<{ field: string; message: string; code: string }>;
            };
            
            response.status(HttpStatus.BAD_REQUEST);
            return throwError(() => ApiResponseBuilder.validationError(
              validationResponse.message,
              validationResponse.errors
            ));
          }
        }
        
        // Handle other HTTP exceptions
        if (error instanceof HttpException) {
          const status = error.getStatus();
          const errorResponse = error.getResponse();
          
          let message = error.message;
          let code = 'HTTP_ERROR';
          
          if (typeof errorResponse === 'object' && errorResponse !== null) {
            const responseObj = errorResponse as Record<string, unknown>;
            message = (responseObj.message as string) || message;
            code = (responseObj.error as string) || code;
          }
          
          response.status(status);
          
          // Map common HTTP status codes to appropriate error responses
          switch (status) {
            case HttpStatus.NOT_FOUND:
              return throwError(() => ApiResponseBuilder.notFound('Resource'));
            case HttpStatus.FORBIDDEN:
              return throwError(() => ApiResponseBuilder.forbidden('access this resource'));
            case HttpStatus.CONFLICT:
              return throwError(() => ApiResponseBuilder.conflict(message));
            default:
              return throwError(() => ApiResponseBuilder.errorWithCode(code, message));
          }
        }
        
        // Handle Prisma errors
        if (error && typeof error === 'object' && 'code' in error) {
          const prismaError = error as { code: string; message: string };
          
          switch (prismaError.code) {
            case 'P2002':
              response.status(HttpStatus.CONFLICT);
              return throwError(() => ApiResponseBuilder.conflict(
                'A record with this information already exists'
              ));
            case 'P2025':
              response.status(HttpStatus.NOT_FOUND);
              return throwError(() => ApiResponseBuilder.notFound('Record'));
            case 'P2003':
              response.status(HttpStatus.BAD_REQUEST);
              return throwError(() => ApiResponseBuilder.errorWithCode(
                'FOREIGN_KEY_CONSTRAINT',
                'Referenced record does not exist'
              ));
            default:
              console.error('Unhandled Prisma error:', prismaError);
              response.status(HttpStatus.INTERNAL_SERVER_ERROR);
              return throwError(() => ApiResponseBuilder.internalError());
          }
        }
        
        // Handle unexpected errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Unexpected error:', error);
        
        response.status(HttpStatus.INTERNAL_SERVER_ERROR);
        return throwError(() => ApiResponseBuilder.internalError(
          process.env.NODE_ENV === 'development' ? errorMessage : undefined
        ));
      }),
    );
  }
}
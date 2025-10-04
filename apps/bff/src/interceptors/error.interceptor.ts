import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponseBuilder } from '../types/api-response';

/**
 * Global error interceptor for consistent error handling
 */
@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        console.error('Controller error:', error);
        
        // Return consistent error response
        return of(ApiResponseBuilder.error('Internal server error'));
      })
    );
  }
}
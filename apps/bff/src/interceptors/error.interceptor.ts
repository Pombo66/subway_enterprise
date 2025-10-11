import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      catchError((error: unknown) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Error in ${method} ${url}:`, msg);
        
        // Don't leak stack traces to client
        if (error instanceof HttpException) {
          return throwError(() => error);
        }
        
        // Return generic error for unexpected errors
        return throwError(() => new HttpException(
          'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR
        ));
      }),
    );
  }
}
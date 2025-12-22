import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (!response || typeof (response as any).status !== 'function') {
      // Non-HTTP context (e.g., bot/telegraf). Log and skip response handling.
      // eslint-disable-next-line no-console
      console.error('[AllExceptionsFilter] Non-HTTP context, skipping response', {
        exception,
        responseType: typeof response,
      });
      return;
    }
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let error_message = 'Internal server error';
    if (exception instanceof HttpException) {
      const exception_response = exception.getResponse();
      if (typeof exception_response === 'string') {
        error_message = exception_response;
      } else if (
        typeof exception_response === 'object' &&
        exception_response !== null
      ) {
        const message = (exception_response as any).message;
        if (Array.isArray(message)) {
          error_message = message.join(', ');
        } else {
          error_message = message || error_message;
        }
        const validationErrors = (exception_response as any).errors;
        if (validationErrors) {
          error_message = validationErrors.join(', ');
        }
      }
    } else if (exception instanceof Error) {
      error_message = exception.message;
    }
    const error_response = {
      status_code: status,
      error: {
        message: error_message,
      },
    };
    response.status(status).json(error_response);
  }
}

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import { APP_CONSTANTS } from '../constants/app.constants';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.headers[APP_CONSTANTS.CORRELATION_ID_HEADER] as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

    if (exception.code === 11000) {
      status = HttpStatus.CONFLICT;
      message = ERROR_MESSAGES.DUPLICATE_ENTRY;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: HttpStatus[status],
      message,
      meta: {
        timestamp: new Date().toISOString(),
        correlationId,
        path: request.url,
      },
    });
  }
}

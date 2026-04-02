import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = Array.isArray(exception.getResponse())
        ? exception.getResponse()
        : (exception.getResponse() as any).message || exception.message;

      return response.status(status).json({
        success: false,
        statusCode: status,
        message: typeof message === 'string' ? message : 'Unauthorized'
      }); // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error'
    });
  }
}

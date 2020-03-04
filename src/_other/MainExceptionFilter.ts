import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class MainExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(400).json(this.errorFormat(exception));
  }

  errorFormat(exception: any) {
    const msg = exception?.message || String(exception);
    const code = exception?.code || 'ERROR';
    return {
      error: {
        message: msg,
        code,
      },
    };
  }
}

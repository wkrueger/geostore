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
    let msg = exception?.message || String(exception);
    if (typeof msg !== 'string') msg = msg.message;
    const code = exception?.code || 'ERROR';
    console.error(exception);
    return {
      error: {
        message: msg,
        code,
      },
    };
  }
}

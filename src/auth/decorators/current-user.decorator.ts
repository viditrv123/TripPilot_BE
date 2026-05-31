import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, unknown>)['user'];

    if (!user) {
      return null;
    }

    if (data) {
      return (user as Record<string, unknown>)[data];
    }

    return user;
  },
);

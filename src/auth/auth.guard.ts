import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authorizationHeader || authorizationHeader !== 'Bearer test-token-123') {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }
}

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('optional-jwt') {
  handleRequest(err: any, user: any, info: any) {
    return user || null;
  }
}

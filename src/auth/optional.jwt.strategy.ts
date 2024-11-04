import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OptionalJwtStrategy extends PassportStrategy(
  Strategy,
  'optional-jwt',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // Este método se llama cuando hay un token válido
  async validate(payload: any) {
    return payload
      ? { userId: payload.sub, email: payload.email, role: payload.role }
      : null;
  }

  // Este método se llama para cada request
  handleRequest(err: any, user: any, info: any) {
    // No lanzamos error si falla la autenticación
    return user || null;
  }
}

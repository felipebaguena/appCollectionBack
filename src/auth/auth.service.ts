import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    console.log('Validating user:', email);
    const user = await this.usersService.findOneByEmail(email);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      console.log('User validated:', { ...result, role: result.role.name });
      return { ...result, role: result.role.name };
    }
    return null;
  }

  async login(user: any) {
    console.log('Login method called with user:', user);
    const payload = { 
      email: user.email, 
      sub: user.id,
      role: user.role
    };
    console.log('Payload for JWT:', payload);
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  signDemoAdmin() {
    return this.jwt.sign({
      sub: 'demo-user',
      roles: ['admin'],
    });
  }
}

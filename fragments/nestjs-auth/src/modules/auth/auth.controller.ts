import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

class LoginDto {
  password?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() _body: LoginDto) {
    const access_token = this.auth.signDemoAdmin();
    return { access_token, token_type: 'Bearer', expires_in: 3600 };
  }
}

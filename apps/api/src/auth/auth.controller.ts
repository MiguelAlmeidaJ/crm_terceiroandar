import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard, AuthRequest } from './auth.guard';

const cookieOptions = () => ({
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(body?.email || '', body?.password || '');
    res.cookie('ta_session', token, { ...cookieOptions(), maxAge: 8 * 60 * 60 * 1000 });
    return { user };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: AuthRequest) {
    return { user: req.user };
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: AuthRequest, @Body() input: { name?: unknown }) {
    return { user: await this.auth.updateProfile(req.user!.id, input) };
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(@Req() req: AuthRequest, @Body() input: { currentPassword?: unknown; newPassword?: unknown }, @Res({ passthrough: true }) res: Response) {
    const token = await this.auth.changePassword(req.user!.id, input);
    res.cookie('ta_session', token, { ...cookieOptions(), maxAge: 8 * 60 * 60 * 1000 });
    return { success: true };
  }

  @Post('logout')
  logout(@Req() _req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('ta_session', cookieOptions());
    return { success: true };
  }
}

import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthRequest } from '../auth/auth.guard';
import { AdminGuard } from './admin.guard';
import { UserInput, UsersService } from './users.service';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  list() { return this.users.list(); }

  @Post('users')
  create(@Body() body: UserInput, @Req() req: AuthRequest) {
    return this.users.create(body, req.user!.id);
  }

  @Patch('users/:id')
  update(@Param('id') id: string, @Body() body: UserInput, @Req() req: AuthRequest) {
    return this.users.update(id, body, req.user!.id);
  }

  @Get('audit')
  audit() { return this.users.audit(); }
}

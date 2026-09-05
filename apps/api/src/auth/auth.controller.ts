import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE, readRefreshToken } from './auth.rules';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthenticateDto } from './dto/authenticate.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { SessionUser } from './session-user';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('google')
  async authenticate(
    @Body() dto: AuthenticateDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionEntity> {
    const session = await this.auth.authenticate(dto.idToken, new Date());
    this.setCookies(response, session);
    return session;
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionEntity> {
    const token = readRefreshToken(dto.refreshToken, cookiesOf(request));
    const session = await this.auth.refresh(token ?? '', new Date());
    this.setCookies(response, session);
    return session;
  }

  @Post('logout')
  async logout(
    @Body() dto: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    const token = readRefreshToken(dto.refreshToken, cookiesOf(request));
    if (token !== null) await this.auth.logout(token, new Date());

    response.clearCookie(ACCESS_COOKIE);
    response.clearCookie(REFRESH_COOKIE);
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: SessionUser): UserEntity {
    return this.auth.toUser(user);
  }

  private setCookies(response: Response, session: SessionEntity): void {
    const secure = this.config.getOrThrow<boolean>('COOKIE_SECURE');
    const base = {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
    } as const;

    response.cookie(ACCESS_COOKIE, session.accessToken, {
      ...base,
      maxAge: this.config.getOrThrow<number>('ACCESS_TOKEN_TTL') * 1000,
    });
    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...base,
      maxAge: this.config.getOrThrow<number>('REFRESH_TOKEN_TTL') * 1000,
    });
  }
}

function cookiesOf(request: Request): Record<string, string | undefined> {
  const cookies: unknown = (request as { cookies?: unknown }).cookies;
  return typeof cookies === 'object' && cookies !== null
    ? (cookies as Record<string, string | undefined>)
    : {};
}

import {
  Body,
  Controller as NestRoute,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthApplication } from '../../application/auth.js';
import type { Tokens } from '../../model/session.js';
import { fromTokens, fromUser } from '../../adapter/out/auth-response.js';
import {
  AuthenticateRequest,
  RefreshRequest,
} from '../../wire/in/auth-request.js';
import {
  CONFIGURATION,
  type Configuration,
} from '../../model/configuration.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../model/credentials.js';
import { AuthGuard, callerOf } from './auth.guard.js';
import type { Authenticated } from './auth.guard.js';
import { credentialsOf } from './credentials.js';
import { FailureException, parseBody } from './http-error.js';

@NestRoute('auth')
export class AuthHttp {
  constructor(
    private readonly auth: AuthApplication,
    @Inject(CONFIGURATION) private readonly config: Configuration,
  ) {}

  @Post('google')
  async authenticate(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const request = parseBody(AuthenticateRequest, body);
    const result = await this.auth.authenticate(request.idToken, new Date());
    if (!result.ok)
      throw new FailureException({ of: 'identity', rejection: result.error });

    this.setCookies(response, result.value);
    return fromTokens(
      result.value.user,
      result.value.accessToken,
      result.value.refreshToken,
    );
  }

  @Post('refresh')
  async refresh(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = parseBody(RefreshRequest, body ?? {});
    const result = await this.auth.refreshFrom(
      credentialsOf(request),
      parsed.refreshToken ?? null,
      new Date(),
    );
    if (!result.ok)
      throw new FailureException({ of: 'session', rejection: result.error });

    this.setCookies(response, result.value);
    return fromTokens(
      result.value.user,
      result.value.accessToken,
      result.value.refreshToken,
    );
  }

  @Post('logout')
  async logout(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = parseBody(RefreshRequest, body ?? {});
    await this.auth.logoutFrom(
      credentialsOf(request),
      parsed.refreshToken ?? null,
      new Date(),
    );

    response.clearCookie(ACCESS_COOKIE);
    response.clearCookie(REFRESH_COOKIE);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: Authenticated) {
    return fromUser(callerOf(request));
  }

  private setCookies(response: Response, tokens: Tokens): void {
    const base = {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
    } as const;
    response.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...base,
      maxAge: this.config.accessTokenTtl * 1000,
    });
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...base,
      maxAge: this.config.refreshTokenTtl * 1000,
    });
  }
}

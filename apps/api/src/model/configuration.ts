export const CONFIGURATION = 'CONFIGURATION';

export type Configuration = {
  readonly port: number;
  readonly databaseUrl: string;
  readonly authSecret: string;
  readonly accessTokenTtl: number;
  readonly refreshTokenTtl: number;
  readonly oidcJwksUrl: string;
  readonly oidcIssuer: string;
  readonly oidcAudiences: readonly string[];
  readonly cookieSecure: boolean;
};

export type ConfigurationRejection = {
  readonly problems: readonly {
    readonly variable: string;
    readonly message: string;
  }[];
};

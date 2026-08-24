export const ACCESS_COOKIE = 'appname_access';
export const REFRESH_COOKIE = 'appname_refresh';

export type Credentials = {
  readonly authorization: string | null;
  readonly cookies: Readonly<Record<string, string>>;
};

export type Response<T> = {
  status: number;
  body: T;
  cookies: readonly string[];
};

export async function call<T>(
  url: string,
  path: string,
  init: {
    method?: string;
    body?: unknown;
    token?: string | null;
    cookie?: string | null;
  } = {},
): Promise<Response<T>> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (init.token != null) headers['authorization'] = `Bearer ${init.token}`;
  if (init.cookie != null) headers['cookie'] = init.cookie;

  const response = await fetch(`${url}${path}`, {
    method: init.method ?? 'GET',
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

  const text = await response.text();
  const body = text.length === 0 ? (null as T) : (JSON.parse(text) as T);
  return {
    status: response.status,
    body,
    cookies: response.headers.getSetCookie(),
  };
}

export function cookieHeader(cookies: readonly string[]): string {
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
};

export type Space = {
  id: string;
  name: string;
  description: string | null;
  role: 'host' | 'guest';
  createdAt: string;
  updatedAt: string;
};

export type Invite = {
  token: string;
  spaceId: string;
  expiresAt: string;
};

export type Failure = {
  statusCode: number;
  message: string | string[];
  error?: string;
};
